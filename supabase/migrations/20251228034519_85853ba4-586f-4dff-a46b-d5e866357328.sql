-- Add support for package deposits
ALTER TABLE booking_deposits 
ADD COLUMN purchase_type text NOT NULL DEFAULT 'booking',
ADD COLUMN package_purchase_id uuid REFERENCES package_purchases(id);

-- Make booking_id nullable since deposits can now be for packages
ALTER TABLE booking_deposits ALTER COLUMN booking_id DROP NOT NULL;

-- Add check constraint to ensure either booking_id or package_purchase_id is set
ALTER TABLE booking_deposits ADD CONSTRAINT deposit_reference_check 
CHECK (
  (purchase_type = 'booking' AND booking_id IS NOT NULL) OR 
  (purchase_type = 'package' AND package_purchase_id IS NOT NULL)
);

-- Add index for package lookups
CREATE INDEX idx_booking_deposits_package_purchase_id ON booking_deposits(package_purchase_id);

-- Rename table to be more generic (optional but clearer)
COMMENT ON TABLE booking_deposits IS 'Deposits for bookings and package purchases';