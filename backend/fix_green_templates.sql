-- Update all email templates from green to blue
UPDATE invoices_emailtemplate 
SET header_color = '#5b95cf' 
WHERE header_color = '#10b981';

-- Show what was updated
SELECT id, name, category, header_color 
FROM invoices_emailtemplate;

