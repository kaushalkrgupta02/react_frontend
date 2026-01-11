import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GuestImportSectionProps {
  venueId: string | null;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function GuestImportSection({ venueId }: GuestImportSectionProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !venueId) return;

    // Reset state
    setResult(null);
    setProgress(0);

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setIsImporting(true);

    try {
      // For now, we only support CSV parsing
      // For Excel, users should save as CSV first
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        toast.error('Please save your Excel file as CSV first');
        setIsImporting(false);
        return;
      }

      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error('No data found in file');
        setIsImporting(false);
        return;
      }

      const importResult: ImportResult = { success: 0, failed: 0, errors: [] };
      const totalRows = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(Math.round(((i + 1) / totalRows) * 100));

        // Map common column names
        const guestName = row.name || row.guest_name || row.fullname || row['full name'] || '';
        const guestPhone = row.phone || row.guest_phone || row.mobile || row.telephone || '';
        const guestEmail = row.email || row.guest_email || '';
        const vipStatus = row.vip_status || row.status || row.tier || 'regular';
        const tagsStr = row.tags || '';

        if (!guestName && !guestPhone && !guestEmail) {
          importResult.failed++;
          importResult.errors.push(`Row ${i + 2}: No name, phone, or email provided`);
          continue;
        }

        // Parse tags
        const tags = tagsStr ? tagsStr.split(';').map(t => t.trim()).filter(Boolean) : [];

        try {
          const { error } = await supabase
            .from('venue_guest_profiles')
            .insert({
              venue_id: venueId,
              guest_name: guestName || null,
              guest_phone: guestPhone || null,
              guest_email: guestEmail || null,
              vip_status: ['regular', 'silver', 'gold', 'platinum', 'vip'].includes(vipStatus.toLowerCase()) 
                ? vipStatus.toLowerCase() 
                : 'regular',
              tags,
              dietary_restrictions: [],
              preferences: {},
              total_visits: 0,
              total_spend: 0,
            } as any);

          if (error) {
            importResult.failed++;
            importResult.errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            importResult.success++;
          }
        } catch (err) {
          importResult.failed++;
          importResult.errors.push(`Row ${i + 2}: Failed to import`);
        }
      }

      setResult(importResult);
      
      if (importResult.success > 0) {
        toast.success(`Imported ${importResult.success} guests`);
      }
      if (importResult.failed > 0) {
        toast.error(`Failed to import ${importResult.failed} rows`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to process file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,phone,email,vip_status,tags
John Doe,+628123456789,john@email.com,regular,wine-lover;weekender
Jane Smith,+628987654321,jane@email.com,vip,high-spender;event-host
Michael Brown,+628555666777,michael@email.com,gold,regular`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!venueId) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Select a venue to import guests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Import guest profiles from a CSV file. Download the template to see the expected format.
      </p>

      {/* Template Download */}
      <Card className="p-4 border-dashed">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-green-500" />
            <div>
              <p className="font-medium text-foreground">Download Template</p>
              <p className="text-xs text-muted-foreground">CSV file with example data</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </Card>

      {/* Upload Area */}
      <Card className="p-6 border-dashed">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isImporting}
        />
        
        <div className="text-center">
          {isImporting ? (
            <div className="space-y-4">
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
              <div>
                <p className="font-medium text-foreground">Importing guests...</p>
                <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
              </div>
              <Progress value={progress} className="max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">Upload Guest List</p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports CSV files. For Excel, save as CSV first.
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Import Result */}
      {result && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {result.success > 0 && (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{result.success} imported</span>
                </div>
              )}
              {result.failed > 0 && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">{result.failed} failed</span>
                </div>
              )}
            </div>
            
            {result.errors.length > 0 && (
              <div className="p-3 bg-red-500/10 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-red-400 mb-2">Errors:</p>
                {result.errors.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-xs text-red-400">{err}</p>
                ))}
                {result.errors.length > 10 && (
                  <p className="text-xs text-red-400 mt-1">
                    ...and {result.errors.length - 10} more errors
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Expected Format Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Expected columns:</strong></p>
        <ul className="list-disc list-inside ml-2 space-y-0.5">
          <li><code>name</code> or <code>guest_name</code> - Guest's full name</li>
          <li><code>phone</code> or <code>guest_phone</code> - Phone number</li>
          <li><code>email</code> or <code>guest_email</code> - Email address</li>
          <li><code>vip_status</code> - regular, silver, gold, platinum, or vip</li>
          <li><code>tags</code> - Semicolon-separated tags (e.g., "wine-lover;vip")</li>
        </ul>
      </div>
    </div>
  );
}
