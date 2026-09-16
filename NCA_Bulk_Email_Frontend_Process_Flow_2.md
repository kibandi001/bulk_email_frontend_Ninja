# NCA Bulk Email as a Service — Front-End Process Flow

 **Frontend stack assumption:** React + TypeScript.  
**Backend/infrastructure:** Consumed through authenticated APIs; not implemented by the frontend.

---

> note:
> fix authService for admin, campaign_manager,auditor, application integrator

## 1. Authentication Flow

```text
User opens NCA Bulk Email Portal
        ↓
Login
        ↓
Enter username/email + password
        ↓
MFA required?
   ┌────┴────┐
   │         │
  Yes        No
   ↓         ↓
Enter MFA   Continue
code
   ↓
Authentication successful
        ↓
Load user profile + RBAC permissions
        ↓
Create authenticated session
        ↓
Check session validity
        ↓
Load appropriate dashboard
```

### Authentication failure

```text
Login attempt
    ↓
Invalid credentials/MFA
    ↓
Display error
    ↓
Allow retry
```

### Session expiry

```text
Active session
    ↓
Inactivity timeout
    ↓
Invalidate session
    ↓
Redirect to Login
    ↓
Authenticate again
```

---

## 2. Templates Flow

```text
TEMPLATES
    ↓
Template Library
    ↓
Choose operation
    ├── Use Template
    ├── Create Template
    ├── Edit Template
    ├── Duplicate Template
    └── Preview Template
```

### Template Library

```text
Template Library
   ↓
Search / Filter / Sort
   ↓
Select Template
   ├── Preview
   ├── Edit
   ├── Duplicate
   ├── Use in Campaign
   └── Delete
```

Filter/category options mirror the NCA-branded template suite: **Notices,
Newsletters, Reminders, Campaigns**.

### Create/Edit Template

```text
Create / Edit Template
        ↓
Template Editor
        ↓
Add / edit:
   ├── Text
   ├── Images
   ├── Sections / blocks
   ├── Merge fields
   ├── Dynamic content
   └── Conditional content
        ↓
Responsive / Mobile Preview
        ↓
Device / Email-client Preview
        ↓
Validate
        ↓
Save Template
        ↓
Template Library
```

### Template → Campaign

```text
Template Library
      ↓
Select Template
      ↓
Use Template
      ↓
Campaign Studio
      ↓
Customize Content
      ↓
Personalization
      ↓
Select Audience
      ↓
Pre-send Validation
      ↓
Schedule / Send
```

**Notes:**

- Template design and brand-guideline approval sit with Tilil (design) and
  NCA (approval/sign-off), per the report's RACI; the frontend surfaces the
  approved library, it does not perform brand approval.
- Device/email-client preview must cover the same rendering matrix used in
  Campaign Pre-Flight (§8).

---

## 3. Main Application Flow

```text
                              Dashboard
                                 ↓
       ┌───────────────┬────────┴───────┬────────────────┬────────────────┐
       ↓                ↓                ↓                ↓                ↓
   Campaigns        Templates        Contacts         Analytics         Messages
       ↓                                  ↓                ↓
   Reports                            Consent           System Status
       ↓                                  ↓
 Administration                     Audit Logs
```

The user's RBAC permissions determine which modules and actions are visible.

---

## 4. Dashboard Flow

```text
Login
  ↓
Dashboard
  ↓
Fetch dashboard data from API
  ↓
Display:
  ├── Emails sent
  ├── Delivery rate
  ├── Opens
  ├── Clicks
  ├── Bounces
  ├── Unsubscribes
  ├── Complaints
  ├── Quota consumption
  └── Recent campaigns/events
```

### Dashboard filtering

```text
Dashboard
   ↓
User selects date range/filter
   ↓
Frontend sends query to API
   ↓
API returns aggregated data
   ↓
Frontend updates charts/tables
```

---

## 5. Campaign Creation Flow

```text
Campaigns
   ↓
Create Campaign
   ↓
Campaign information
   ├── Campaign name
   ├── Sender
   ├── Subject
   └── Sending identity
   ↓
Select template
   ↓
Template Library (see §2)
   ↓
Campaign Studio
   ↓
Drag-and-drop content
   ↓
Edit text/images
   ↓
Insert personalization fields
   ↓
Configure dynamic/conditional content
   ↓
Select audience
   ↓
Configure A/B testing?
   ├── No → Continue
   └── Yes
         ↓
     Configure variants
         ↓
     Continue
   ↓
Save draft
```

---

## 6. Audience Selection Flow

```text
Campaign
   ↓
Select Audience
   ↓
Choose:
   ├── Mailing list
   ├── Multiple lists
   ├── Saved segment
   └── Dynamic criteria
   ↓
Apply filters
   ↓
Display estimated recipient count
   ↓
Check suppression/consent status
   ↓
Valid recipients available?
   ├── No → Display error / modify audience
   └── Yes
         ↓
     Confirm audience
```

---

## 7. Campaign Pre-Flight Flow

```text
Campaign ready
    ↓
Run pre-send validation
    ↓
┌────────────────────────────┐
│ Validation checks           │
├────────────────────────────┤
│ ✓ Recipients                │
│ ✓ Consent/suppression       │
│ ✓ Sender configuration      │
│ ✓ Spam score                │
│ ✓ Deliverability            │
│ ✓ Inbox placement           │
│ ✓ Device rendering          │
│ ✓ Email-client rendering    │
└────────────────────────────┘
    ↓
Problems?
   ┌────┴────┐
   │         │
  Yes        No
   ↓         ↓
Fix issues  Continue
   ↓         ↓
Re-run      Schedule/Send
validation
```

---

## 8. Scheduling / Sending Flow

```text
Validated campaign
       ↓
Choose sending mode
       ↓
 ┌──────────────┬───────────────────┐
 │              │                   │
Send now     Schedule            Triggered
 │           date/time             send
 │              │                   │
 └──────────────┴───────────────────┘
                ↓
          Confirmation
                ↓
       Submit campaign to API
                ↓
       Backend accepts request
                ↓
       Campaign status = Queued
                ↓
       Frontend monitors status
```

**Important:** The React frontend submits the campaign to the backend. It does not directly send email.

---

## 9. Campaign Monitoring Flow

```text
Campaign = Queued
       ↓
API polling / event updates
       ↓
Campaign = Sending
       ↓
Monitor:
   ├── Sent
   ├── Delivered
   ├── Opened
   ├── Clicked
   ├── Bounced
   ├── Complained
   └── Unsubscribed
       ↓
Campaign = Completed
```

### Campaign detail view

```text
Campaign
   ↓
Campaign Details
   ├── Overview
   ├── Recipients
   ├── Delivery
   ├── Engagement
   ├── Bounces
   ├── Unsubscribes
   └── Timeline
```

---

## 10. Contact Management Flow

```text
Contacts
   ↓
Choose operation
   ↓
┌──────────────┬───────────────┬──────────────┐
│              │               │              │
View         Create          Import         Bulk action
 │              │               │              │
 ↓              ↓               ↓              ↓
Search        Form           Select file     Select records
Filter          ↓               ↓              ↓
Sort          Validate       Validate        Confirm
Pagination       ↓               ↓              ↓
                Save          Preview          ↓
                  ↓               ↓           Execute
                  └───────────────┴─────────────┘
                                  ↓
                            Refresh contact list
```

### Contact import

```text
Upload TXT/Excel
      ↓
Preview data
      ↓
Validate
      ↓
Show errors/warnings
      ↓
Confirm import
      ↓
API import request
      ↓
Import result
      ├── Imported
      ├── Duplicates
      ├── Invalid
      ├── Suppressed
      └── Failed
```

---

## 11. Contact Details Flow

```text
Contacts
   ↓
Select contact
   ↓
Contact Profile
   ├── Personal information
   ├── Organisation
   ├── Category
   ├── Consent status
   ├── Lawful basis
   ├── Preferences
   ├── Source system
   ├── Last emailed
   └── Engagement history
```

---

## 12. Consent / Preference Flow

```text
Contact
   ↓
Consent & Preferences
   ↓
Display:
   ├── Subscription status
   ├── Lawful basis
   ├── Consent source
   └── Subscription preferences
   ↓
User/contact changes preference
   ↓
Submit change
   ↓
API
   ↓
Database updated
   ↓
Frontend displays new status
```

### Unsubscribe flow

```text
Unsubscribe
   ↓
Confirmation
   ↓
API
   ↓
Contact becomes suppressed/unsubscribed
   ↓
Frontend updates status
```

---

## 13. Analytics Flow

```text
Analytics
   ↓
Choose:
   ├── Campaign
   ├── Date range
   ├── Segment
   └── Metrics
        ↓
Request analytics
        ↓
API
        ↓
Display:
   ├── Delivery
   ├── Opens
   ├── Clicks
   ├── Bounces
   ├── Unsubscribes
   ├── Complaints
   ├── Geography
   ├── Device
   ├── Browser
   └── Email client
```

### Campaign comparison

```text
Analytics
   ↓
Compare Campaigns
   ↓
Select Campaign A
Select Campaign B
   ↓
Comparison view
```

---

## 14. Reporting Flow

```text
Reports
   ↓
Choose report type
   ↓
Select filters
   ├── Date
   ├── Campaign
   ├── Audience
   └── Metrics
   ↓
Generate report
   ↓
Display results
   ↓
 ┌─────────────┬──────────────┬───────────────┐
 │             │              │               │
 View       Export CSV    Export Excel    Schedule
                                            report
```

---

## 15. Message Log Flow

```text
Messages
   ↓
Fetch message logs
   ↓
Filter/search
   ├── Recipient
   ├── Campaign
   ├── Status
   ├── Date
   └── Event
   ↓
Select message
   ↓
Message timeline
   ├── Submitted
   ├── Queued
   ├── Sent
   ├── Delivered
   ├── Opened
   ├── Clicked
   └── Bounced/Failed
```

### Failed message

```text
Failed message
      ↓
Failure details
      ↓
Display reason
      ↓
Possible remediation/investigation
```

---

## 16. Quota Flow

```text
Dashboard / Quota
      ↓
Fetch usage
      ↓
Calculate/display percentage
      ↓
┌─────────┬─────────┬─────────┐
│ <80%    │ 80–89%  │ 90–99%  │ 100%+
│ Normal  │ Warning │ Critical│ Limit
└─────────┴─────────┴─────────┘
```

The platform provides the actual quota thresholds and alerts; the frontend displays the resulting status.

---

## 17. Administration Flow

```text
Administration
    ↓
Choose:
    ├── Users
    ├── Roles/Permissions
    ├── Quotas
    └── System Settings
```

### User administration

```text
Users
 ↓
Search
 ↓
Select user
 ↓
View/Edit
 ↓
Enable/Disable
 ↓
Assign role
 ↓
Save
```

### Role administration

```text
Roles
 ↓
Select role
 ↓
Permissions matrix
 ↓
Enable/disable permissions
 ↓
Save
```

---

## 18. Audit Log Flow

```text
Audit Logs
   ↓
Fetch logs
   ↓
Search/filter
   ├── User
   ├── Action
   ├── Resource
   ├── Date
   └── Event type
   ↓
Select event
   ↓
View details
   ↓
Download/export
```

---

## 19. Global Frontend State Flow

Most frontend operations follow the same basic pattern:

```text
User Action
    ↓
React Component
    ↓
Client-side validation
    ↓
API Request
    ↓
Authentication / Authorization
    ↓
Backend
    ↓
Response
    ↓
Application state / API cache
    ↓
React UI update
```

### Error flow

```text
API Request
    ↓
Error
    ↓
Frontend error handler
    ↓
User-friendly error message
    ↓
Retry / Correct / Cancel
```

---

## 20. Complete End-to-End Flow

```text
LOGIN
  ↓
MFA
  ↓
RBAC / SESSION
  ↓
DASHBOARD
  ↓
Choose operation
  │
  ├── CAMPAIGN
  │      ↓
  │   Create/Edit
  │      ↓
  │   Select Template (Template Library)
  │      ↓
  │   Select Audience
  │      ↓
  │   Consent/Suppression Check
  │      ↓
  │   Pre-send Validation
  │      ↓
  │   Spam / Inbox / Rendering Tests
  │      ↓
  │   Schedule / Send
  │      ↓
  │   API
  │      ↓
  │   Queued
  │      ↓
  │   Sending
  │      ↓
  │   Monitor Events
  │      ↓
  │   Campaign Analytics
  │
  ├── TEMPLATES
  │      ↓
  │   Use / Create / Edit
  │      ↓
  │   Merge Fields / Dynamic Blocks
  │      ↓
  │   Responsive Preview
  │      ↓
  │   Save to Template Library
  │
  ├── CONTACTS
  │      ↓
  │   Search / Create / Edit / Import
  │      ↓
  │   Validate
  │      ↓
  │   Consent / Preferences
  │      ↓
  │   Contact History
  │
  ├── ANALYTICS
  │      ↓
  │   Filter
  │      ↓
  │   Aggregate
  │      ↓
  │   Charts / Tables / Heatmaps
  │
  ├── REPORTS
  │      ↓
  │   Build
  │      ↓
  │   Generate
  │      ↓
  │   View / Export / Schedule
  │
  ├── MESSAGES
  │      ↓
  │   Search / Filter
  │      ↓
  │   Event Timeline
  │
  ├── ADMINISTRATION
  │      ↓
  │   Users / Roles / Quotas / Settings
  │
  └── AUDIT
         ↓
      Search / Filter
         ↓
      View / Download
```

---

## 21. Core Frontend Loop

```text
Authenticate
     ↓
Observe
     ↓
Configure
     ↓
Validate
     ↓
Submit
     ↓
Monitor
     ↓
Analyze
     ↓
Report
```

This is the core workflow around which the frontend can be organized.
