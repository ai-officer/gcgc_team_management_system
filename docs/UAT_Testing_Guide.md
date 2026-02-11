# User Acceptance Testing (UAT) Guide

## Overview

This guide provides instructions for conducting User Acceptance Testing (UAT) for the GCGC Team Management System (TMS). The UAT process ensures that the system meets business requirements and functions correctly in real-world scenarios.

## Purpose of UAT

User Acceptance Testing is the final phase of testing where actual users validate that the system:
- Meets business requirements
- Functions correctly in real-world scenarios
- Is ready for production deployment
- Provides a satisfactory user experience

## Test Documentation

### Main Test Document
- **File**: `docs/UAT_Test_Cases.csv`
- **Format**: CSV (can be opened in Excel, Google Sheets, or any spreadsheet application)
- **Total Test Cases**: 100+ comprehensive test scenarios

### Test Case Structure

Each test case includes:

| Column | Description |
|--------|-------------|
| **Test Case ID** | Unique identifier (e.g., TC-AUTH-001) |
| **Module** | Feature area (Authentication, Tasks, Teams, etc.) |
| **Feature** | Specific functionality being tested |
| **Test Scenario** | Description of what is being tested |
| **Prerequisites** | Required setup before testing |
| **Test Steps** | Step-by-step instructions |
| **Expected Result** | What should happen if test passes |
| **Actual Result** | To be filled by tester |
| **Status** | To be filled by tester (Pass/Fail/Blocked/Skip) |
| **Priority** | Test importance (High/Medium/Low) |
| **Role Required** | User role needed for testing |
| **Notes** | Additional information |

## Testing Modules

The test cases are organized by module:

### 1. Authentication (TC-AUTH-xxx)
- User registration
- Email/password login
- Google OAuth login
- Session management
- Logout functionality

### 2. User Management (TC-USER-xxx)
- View users
- Create/edit/delete users
- Role assignment
- Profile management
- User deactivation

### 3. Team Management (TC-TEAM-xxx)
- Create/edit/delete teams
- Add/remove team members
- Assign team leaders
- View team details

### 4. Task Management (TC-TASK-xxx)
- Create/edit/delete tasks
- Assign tasks
- Update task status
- Filter and sort tasks
- Task priority and due dates

### 5. Subtask Management (TC-SUB-xxx)
- Create subtasks during task creation
- View subtasks within parent task
- Update subtask progress
- Assign subtasks to team members
- Subtask due dates
- Subtask visibility in Kanban board
- Subtask visibility in Calendar

### 6. Calendar & Events (TC-CAL-xxx)
- View calendar
- Create/edit/delete events
- Google Calendar synchronization
- Calendar view modes
- Multiple events handling

### 7. Comments & Communication (TC-COMM-xxx)
- Add/edit/delete comments
- View comment history
- Comment notifications

### 8. Permissions & Access Control (TC-PERM-xxx)
- Admin access control
- Leader permissions
- Member permissions
- Role-based dashboards
- Task visibility permissions

### 9. Activity Log (TC-ACT-xxx)
- View activity history
- Activity types logging
- Filter activities

### 10. Integrations (TC-INT-xxx)
- TMS Chat links
- Email notifications
- External system integrations

### 11. User Interface (TC-UI-xxx)
- Responsive design
- Navigation
- Form validation
- Loading states
- Error handling

### 12. Performance (TC-PERF-xxx)
- Page load times
- Search performance

### 13. Security (TC-SEC-xxx)
- Password security
- Session security
- CSRF protection
- SQL injection protection
- XSS protection

### 14. Data Management (TC-DATA-xxx)
- Data export
- Data backup
- Data integrity

## Testing Process

### Phase 1: Preparation (Before Testing)

1. **Set Up Test Environment**
   - Ensure access to staging/test environment
   - Verify test environment is properly configured
   - Create test user accounts with different roles:
     - Admin user
     - Leader user
     - Member user

2. **Review Test Cases**
   - Open `UAT_Test_Cases.csv` in spreadsheet application
   - Review test cases assigned to you
   - Note any questions or clarifications needed

3. **Prepare Test Data**
   - Create sample teams
   - Create sample users
   - Prepare test tasks and events

### Phase 2: Test Execution

1. **Follow Test Case Order**
   - Execute test cases by priority (High → Medium → Low)
   - Complete all prerequisites before starting test
   - Follow test steps exactly as written

2. **Record Results**
   - Fill in "Actual Result" column with what actually happened
   - Update "Status" column:
     - **Pass**: Test succeeded, matches expected result
     - **Fail**: Test failed, doesn't match expected result
     - **Blocked**: Cannot complete due to dependency/bug
     - **Skip**: Test skipped (note reason in Notes column)

3. **Document Issues**
   - For failed tests, document detailed steps to reproduce
   - Take screenshots of errors
   - Note browser/device information
   - Add detailed notes in "Notes" column

### Phase 3: Reporting

1. **Daily Status Updates**
   - Report number of tests completed
   - Report pass/fail counts
   - Highlight blocking issues

2. **Bug Reporting**
   - For each failed test, create bug report with:
     - Test Case ID
     - Steps to reproduce
     - Expected vs actual result
     - Screenshots
     - Environment details

3. **Final Report**
   - Summary of all tests executed
   - Overall pass/fail percentage
   - List of critical issues found
   - Recommendation (Ready for production / Needs fixes)

## Testing Best Practices

### DO:
✅ Test with different user roles (Admin, Leader, Member)
✅ Test on different browsers (Chrome, Firefox, Safari, Edge)
✅ Test on different devices (Desktop, Tablet, Mobile)
✅ Clear browser cache between test sessions
✅ Report issues immediately when found
✅ Provide detailed reproduction steps for bugs
✅ Test both positive and negative scenarios
✅ Verify error messages are user-friendly

### DON'T:
❌ Skip prerequisite steps
❌ Modify test steps without documenting
❌ Assume something works without testing
❌ Test only happy path scenarios
❌ Rush through tests
❌ Test in production environment

## Test Environment Requirements

### Required Access
- Test/staging environment URL
- Test user credentials (Admin, Leader, Member roles)
- Access to test database (for Admin-level tests)
- Access to email for notification testing

### Required Tools
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)
- Spreadsheet application (Excel, Google Sheets, LibreOffice Calc)
- Screenshot tool
- Mobile device for responsive testing (optional but recommended)

### Environment Details
Record the following for your test session:
- **Environment**: Staging / Test / UAT
- **URL**: [Environment URL]
- **Browser**: [Browser name and version]
- **OS**: [Operating system]
- **Date**: [Testing date]
- **Tester**: [Your name]

## Test Execution Schedule

Recommended testing timeline:

### Week 1: Core Functionality
- Days 1-2: Authentication & User Management (TC-AUTH-xxx, TC-USER-xxx)
- Days 3-4: Team Management (TC-TEAM-xxx)
- Day 5: Review and retest failures

### Week 2: Feature Testing
- Days 1-2: Task Management (TC-TASK-xxx)
- Day 3: Subtask Management (TC-SUB-xxx)
- Day 4: Calendar & Events (TC-CAL-xxx)
- Day 5: Review and retest failures

### Week 3: Permissions & Communication
- Days 1-2: Comments & Permissions (TC-COMM-xxx, TC-PERM-xxx)
- Day 3-4: Activity Log & Integrations (TC-ACT-xxx, TC-INT-xxx)
- Day 5: Review and retest failures

### Week 4: Quality & Sign-off
- Day 1: UI/UX Testing (TC-UI-xxx)
- Day 2: Performance & Security (TC-PERF-xxx, TC-SEC-xxx)
- Day 3: Data Management (TC-DATA-xxx)
- Day 4: Final regression testing
- Day 5: UAT sign-off

## Common Issues & Troubleshooting

### Issue: Cannot Login
- **Solution**: Verify user account exists and is active
- **Solution**: Check if using correct environment URL
- **Solution**: Clear browser cache and cookies

### Issue: Page Not Loading
- **Solution**: Check network connection
- **Solution**: Verify environment is running
- **Solution**: Check browser console for errors

### Issue: Permission Denied
- **Solution**: Verify logged in with correct role
- **Solution**: Check if user has necessary team assignments
- **Solution**: Log out and log back in

### Issue: Data Not Appearing
- **Solution**: Refresh the page
- **Solution**: Verify data was saved successfully
- **Solution**: Check if filters are applied

## Test Case Priority Guidelines

### High Priority (Must Test)
Critical functionality that affects core business operations:
- User authentication
- Task creation and assignment
- Team management
- Basic CRUD operations
- Security features

### Medium Priority (Should Test)
Important features that enhance user experience:
- Advanced filtering and sorting
- Calendar integration
- Activity logging
- Profile management
- Notifications

### Low Priority (Nice to Test)
Supporting features and edge cases:
- Data export
- Advanced search
- UI polish items
- Performance optimization

## Sign-Off Criteria

The system is ready for production when:

✅ **All High Priority tests**: 100% pass rate
✅ **All Medium Priority tests**: 95% pass rate
✅ **All Low Priority tests**: 90% pass rate
✅ **Critical bugs**: 0 outstanding
✅ **High severity bugs**: 0 outstanding
✅ **Medium severity bugs**: < 5 outstanding (with workarounds documented)
✅ **Security tests**: 100% pass rate
✅ **Performance tests**: Meet defined thresholds
✅ **Cross-browser testing**: Completed for all major browsers
✅ **Mobile responsive testing**: Completed

## UAT Sign-Off Form

At the end of testing, complete the sign-off form:

```
UAT SIGN-OFF FORM
=================

Project: GCGC Team Management System
Test Environment: ___________________
Testing Period: ___________________

Test Summary:
- Total Test Cases: _______
- Tests Executed: _______
- Tests Passed: _______
- Tests Failed: _______
- Tests Blocked: _______
- Tests Skipped: _______
- Pass Rate: _______%

Critical Issues Found: _______
High Severity Issues: _______
Medium Severity Issues: _______
Low Severity Issues: _______

Recommendation:
[ ] Ready for Production
[ ] Ready with Minor Fixes
[ ] Not Ready - Major Issues Found

Tester Name: ___________________
Signature: ___________________
Date: ___________________

Business Stakeholder: ___________________
Signature: ___________________
Date: ___________________
```

## Contact & Support

For questions during UAT:
- Technical Issues: [Development Team Contact]
- Test Case Clarifications: [QA Team Contact]
- Business Requirements: [Product Owner Contact]

## Subtask Feature Test Cases (TC-SUB-xxx)

This section provides detailed test cases for the Subtask functionality, allowing normal users to validate the feature.

### TC-SUB-001: Create Task with Subtasks

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Role Required** | Leader or Admin |
| **Prerequisites** | Logged in, have at least 2 team members available |

**Test Steps:**
1. Navigate to the Tasks page (Kanban Board)
2. Click the "Create Task" button
3. Fill in the parent task details:
   - Title: "Main Project Task"
   - Description: "This is the parent task"
   - Priority: High
   - Due Date: Select a date in the future
4. In the "Subtasks" section, click "Add Subtask"
5. Fill in the first subtask:
   - Title: "Subtask 1 - Research"
   - Assignee: Select a team member
   - Due Date: Select a date before parent due date
6. Click "Add Subtask" again for a second subtask:
   - Title: "Subtask 2 - Implementation"
   - Assignee: Select a different team member
   - Due Date: Select a date
7. Click "Create Task" to submit

**Expected Result:**
- Task is created successfully with a success toast message: "Task created with 2 subtasks"
- Parent task appears in the "To Do" column on the Kanban board
- Both subtasks appear as separate cards in the "To Do" column
- Subtasks display a "[Subtask]" badge or indicator

---

### TC-SUB-002: View Subtasks in Parent Task Modal

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Role Required** | Any (Member, Leader, Admin) |
| **Prerequisites** | A parent task with subtasks exists |

**Test Steps:**
1. Navigate to the Tasks page (Kanban Board)
2. Click on a parent task card to open the Task View Modal
3. Look for the "Subtasks" section in the modal

**Expected Result:**
- Task View Modal opens successfully
- Subtasks section displays all child subtasks
- Each subtask shows:
  - Title
  - Assignee name/avatar
  - Progress percentage
  - Due date
  - Status indicator

---

### TC-SUB-003: Update Subtask Progress (Assigned User)

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Role Required** | Member (assigned to the subtask) |
| **Prerequisites** | Logged in as a user assigned to a subtask |

**Test Steps:**
1. Navigate to the Tasks page (Kanban Board)
2. Find and click on a subtask assigned to you
3. In the Task View Modal, locate the progress bar
4. Click on the progress bar to enable editing
5. Drag the progress slider to 50%
6. Click the checkmark/save button to confirm

**Expected Result:**
- Progress updates to 50%
- Success toast message: "Progress updated successfully" or "Progress set to 50%"
- Modal closes after saving
- Subtask card on Kanban board shows updated progress
- If progress is 100%, subtask moves to "Completed" column

---

### TC-SUB-004: Progress Restriction for Non-Leaders

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Role Required** | Member |
| **Prerequisites** | Logged in as Member, assigned to a subtask |

**Test Steps:**
1. Navigate to the Tasks page
2. Click on a subtask assigned to you
3. Try to set progress to 100%

**Expected Result:**
- Progress bar should be restricted to maximum 99%
- Only the Task Creator or Leader can set progress to 100%
- A tooltip or message indicates the restriction if trying to exceed 99%

---

### TC-SUB-005: Subtask Visibility in Calendar

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Role Required** | Any |
| **Prerequisites** | Subtasks with due dates exist |

**Test Steps:**
1. Navigate to the Calendar page
2. Look for subtasks on their due dates
3. Click on a subtask event in the calendar

**Expected Result:**
- Subtasks appear on the calendar with a "[Subtask]" label
- Clicking on a subtask opens the event detail modal
- Modal shows subtask details including parent task reference
- "View Task Details" button opens the full Task View Modal

---

### TC-SUB-006: Edit Subtask from Parent Task

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Role Required** | Leader or Task Creator |
| **Prerequisites** | A parent task with subtasks exists |

**Test Steps:**
1. Navigate to the Tasks page
2. Click on a parent task to open Task View Modal
3. In the Subtasks section, click on a subtask to expand/view it
4. Click the Edit button (if available)
5. Modify the subtask title or due date
6. Save changes

**Expected Result:**
- Subtask details can be edited
- Changes are saved successfully
- Updated subtask information reflects immediately
- Activity log records the edit action

---

### TC-SUB-007: Delete Subtask

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Role Required** | Leader or Task Creator |
| **Prerequisites** | A parent task with subtasks exists |

**Test Steps:**
1. Navigate to the Tasks page
2. Click on a subtask to open its Task View Modal
3. Click the "Edit" button to enter edit mode
4. Look for a delete option or delete the subtask
5. Confirm the deletion

**Expected Result:**
- Confirmation dialog appears before deletion
- Subtask is removed from the parent task
- Subtask no longer appears on the Kanban board
- Subtask no longer appears on the Calendar
- Parent task's subtask count updates

---

### TC-SUB-008: Subtask Notification

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Role Required** | Any |
| **Prerequisites** | Create a subtask and assign it to another user |

**Test Steps:**
1. As a Leader, create a task with a subtask
2. Assign the subtask to a Member
3. Log in as the assigned Member
4. Check the notifications

**Expected Result:**
- Assigned user receives notification: "New Subtask Assigned"
- Notification message includes: subtask title and parent task title
- Clicking notification navigates to the subtask

---

### TC-SUB-009: Subtask Kanban Drag and Drop

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Role Required** | Leader or Assigned Member |
| **Prerequisites** | Subtasks exist in the Kanban board |

**Test Steps:**
1. Navigate to the Tasks page (Kanban Board)
2. Find a subtask in the "To Do" column
3. Drag the subtask card to "In Progress" column
4. Release the card

**Expected Result:**
- Subtask moves to the new column
- Status updates automatically
- Progress may update based on the column:
  - In Progress: Sets minimum progress if currently 0%
  - Done: Sets progress to 100% (Leader only)
- Success feedback shown

---

### TC-SUB-010: Parent Task Progress Calculation

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Role Required** | Any |
| **Prerequisites** | Parent task with multiple subtasks at various progress levels |

**Test Steps:**
1. Create a parent task with 3 subtasks
2. Set Subtask 1 progress to 100%
3. Set Subtask 2 progress to 50%
4. Set Subtask 3 progress to 0%
5. View the parent task

**Expected Result:**
- Parent task progress reflects the average of subtask progress
- Expected calculation: (100 + 50 + 0) / 3 = 50%
- Parent task progress bar shows approximately 50%

---

### TC-SUB-011: Subtask Search and Filter

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Role Required** | Any |
| **Prerequisites** | Multiple subtasks exist |

**Test Steps:**
1. Navigate to the Tasks page
2. Use the search bar to search for a subtask by title
3. Use filters to filter by assignee

**Expected Result:**
- Subtasks appear in search results
- Filters apply to both tasks and subtasks
- Subtasks matching criteria are displayed

---

## Appendix

### A. Test Data Templates

#### Sample Users
```
Admin User:
- Email: admin@test.gcgc.com
- Password: AdminTest123!
- Role: ADMIN

Leader User:
- Email: leader@test.gcgc.com
- Password: LeaderTest123!
- Role: LEADER

Member User:
- Email: member@test.gcgc.com
- Password: MemberTest123!
- Role: MEMBER
```

#### Sample Teams
```
Team 1:
- Name: Development Team
- Description: Software development team
- Leader: leader@test.gcgc.com
- Members: 5 users

Team 2:
- Name: Marketing Team
- Description: Marketing and communications
- Leader: leader2@test.gcgc.com
- Members: 3 users
```

#### Sample Tasks
```
Task 1:
- Title: Complete user authentication
- Description: Implement user login and registration
- Priority: HIGH
- Status: IN_PROGRESS
- Due Date: +7 days

Task 2:
- Title: Design landing page
- Description: Create wireframes for landing page
- Priority: MEDIUM
- Status: TODO
- Due Date: +14 days
```

#### Sample Parent Task with Subtasks
```
Parent Task:
- Title: Website Redesign Project
- Description: Complete redesign of company website
- Priority: HIGH
- Status: IN_PROGRESS
- Due Date: +30 days

Subtask 1:
- Title: Research competitor websites
- Parent: Website Redesign Project
- Assignee: member@test.gcgc.com
- Progress: 0%
- Due Date: +7 days

Subtask 2:
- Title: Create wireframes
- Parent: Website Redesign Project
- Assignee: leader@test.gcgc.com
- Progress: 0%
- Due Date: +14 days

Subtask 3:
- Title: Develop homepage
- Parent: Website Redesign Project
- Assignee: member@test.gcgc.com
- Progress: 0%
- Due Date: +21 days
```

### B. Browser Compatibility Matrix

| Browser | Version | Desktop | Mobile | Status |
|---------|---------|---------|--------|--------|
| Chrome | 90+ | ✅ | ✅ | Supported |
| Firefox | 88+ | ✅ | ✅ | Supported |
| Safari | 14+ | ✅ | ✅ | Supported |
| Edge | 90+ | ✅ | ✅ | Supported |
| Opera | Latest | ⚠️ | ⚠️ | Limited Testing |

### C. Test Result Tracking

Use this format for daily test tracking:

```
Daily Test Report - [Date]
========================

Tester: [Name]
Environment: [Staging/UAT]
Browser: [Browser Name Version]

Tests Executed Today: X
Tests Passed: X
Tests Failed: X
Tests Blocked: X

Issues Found:
1. [Issue description] - [Severity] - [Test Case ID]
2. [Issue description] - [Severity] - [Test Case ID]

Notes:
- [Any observations or concerns]

Next Session Plan:
- [What will be tested next]
```

---

**Document Version**: 1.1
**Last Updated**: 2026-02-11
**Status**: Active

**Changelog**:
- v1.1 (2026-02-11): Added Subtask Management test cases (TC-SUB-001 to TC-SUB-011)
- v1.0 (2026-01-12): Initial UAT Guide release