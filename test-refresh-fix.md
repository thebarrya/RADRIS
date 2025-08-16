# Test Plan: 5-Second Refresh Fix Verification

## Overview
This document outlines the testing procedure to verify that the 5-second automatic page refresh issue on the examinations page has been resolved.

## Changes Made

### 1. RealTimeProvider Optimizations
- **Before**: Aggressive query invalidation causing UI refreshes
- **After**: Selective cache updates and delayed prefetching
- **File**: `/frontend/src/components/layout/RealTimeProvider.tsx`

### 2. Examinations Page Optimizations
- **Before**: Multiple useEffect hooks with potential dependency issues
- **After**: Custom optimized hook with debouncing and background sync
- **Files**: 
  - `/frontend/src/app/examinations/page.tsx`
  - `/frontend/src/hooks/useExaminationsOptimized.ts` (new)

### 3. DICOM Sync Panel Improvements
- **Before**: Potential frequent polling
- **After**: 30-second background refresh interval
- **File**: `/frontend/src/components/examinations/DicomSyncPanel.tsx`

## Test Cases

### Test 1: No Automatic Page Refreshes
**Objective**: Verify that the page no longer refreshes every 5 seconds

**Steps**:
1. Navigate to the examinations page (`/examinations`)
2. Wait and observe for 60 seconds
3. Monitor browser DevTools Console for frequent re-renders
4. Check if page content refreshes automatically

**Expected Result**: 
- No full page refreshes occur automatically
- Console should not show frequent render cycles
- User can interact with the page without interruption

### Test 2: Background Data Synchronization
**Objective**: Verify that data still updates in the background

**Steps**:
1. Open examinations page in one browser tab
2. In another tab, create a new examination or modify an existing one
3. Return to the examinations page
4. Wait up to 60 seconds for background sync

**Expected Result**:
- Data should update in background without page refresh
- New/updated examinations should appear after background sync interval
- UI should remain responsive during updates

### Test 3: Real-time WebSocket Updates
**Objective**: Verify that WebSocket updates still work without causing refreshes

**Steps**:
1. Open examinations page
2. Simulate DICOM arrival or examination status change via backend
3. Observe WebSocket messages in DevTools
4. Check if examination list updates

**Expected Result**:
- WebSocket messages are received
- Examination list updates without page refresh
- Toast notifications appear for relevant events
- UI remains stable

### Test 4: Manual Refresh Functionality
**Objective**: Verify that manual refresh still works

**Steps**:
1. Open examinations page
2. Click the "Actualiser" (Refresh) button
3. Change filters or search parameters
4. Navigate between pages

**Expected Result**:
- Manual refresh works immediately
- Filter changes trigger appropriate data loading
- Pagination works without page refreshes

### Test 5: Performance Verification
**Objective**: Verify improved performance and reduced network requests

**Steps**:
1. Open examinations page with DevTools Network tab open
2. Monitor for 2 minutes
3. Count the number of API requests
4. Check for any excessive polling

**Expected Result**:
- Reduced number of API requests compared to before
- No requests every 5 seconds
- Background sync requests occur at 60-second intervals maximum

## Performance Monitoring

Add this component to the examinations page during testing:

```tsx
import { PerformanceMonitor } from '@/components/debug/PerformanceMonitor';

// Add to examinations page:
{process.env.NODE_ENV === 'development' && (
  <PerformanceMonitor 
    componentName="ExaminationsPage" 
    onRefresh={fetchExaminations}
  />
)}
```

## Success Criteria

✅ **Primary Goal**: No automatic 5-second page refreshes
✅ **Secondary Goal**: Background synchronization still works
✅ **Tertiary Goal**: Real-time updates function properly
✅ **Performance Goal**: Reduced network requests and improved UX

## Rollback Plan

If issues arise, revert these files to their previous versions:
1. `frontend/src/components/layout/RealTimeProvider.tsx`
2. `frontend/src/app/examinations/page.tsx`
3. `frontend/src/components/examinations/DicomSyncPanel.tsx`

And remove:
- `frontend/src/hooks/useExaminationsOptimized.ts`
- `frontend/src/components/debug/PerformanceMonitor.tsx`

## Additional Notes

- The background sync interval can be adjusted in `useExaminationsOptimized.ts`
- WebSocket reconnection logic remains unchanged
- DICOM monitor service on backend is unaffected
- All existing functionality should remain intact