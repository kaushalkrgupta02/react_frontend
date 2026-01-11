import { useInstallPWA } from '@/hooks/useInstallPWA';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useState } from 'react';

export function InstallPrompt() {
  const { isInstallable, installApp } = useInstallPWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setDismissed(true);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <Download className="w-6 h-6 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Install Venue Manager</h3>
            <p className="text-sm text-white/90 mb-3">
              Install this app on your device for quick access and offline use.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                Install
              </Button>
              <Button
                onClick={() => setDismissed(true)}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
