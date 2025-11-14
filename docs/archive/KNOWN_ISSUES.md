# Known Issues

## Console Warnings (Non-Critical)

### Source Map Warnings (Mantine)
**Status**: Cosmetic only, does not affect functionality

**Errors**:
```
Failed to load resource: 404 (Not Found) YearsList.module.css.mjs.map
Failed to load resource: 404 (Not Found) Notifications.module.css.mjs.map
```

**Source**: Mantine UI library's DatePickerInput component (node_modules)
**Impact**: None - these are missing source map files for CSS modules in production builds
**Fix**: These can be ignored, or Mantine can be updated to latest version

### Fixed Issues
- ✅ Controlled component warnings in patients form (added readOnly/onChange handlers)
- ✅ All our application code now properly handles form inputs

