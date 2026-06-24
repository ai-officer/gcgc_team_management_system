/**
 * Hardcoded FAQ content for the floating HelpWidget.
 *
 * To edit the help guides, change this file only — no component logic lives here.
 * Each entry's `answer` may contain multiple lines; blank lines render as
 * paragraph breaks and lines starting with "- " render as bullet steps.
 */

export interface FaqEntry {
  id: string
  question: string
  answer: string
  /** Extra terms used by the search box (not shown to the user). */
  keywords?: string[]
}

export interface FaqCategory {
  id: string
  title: string
  entries: FaqEntry[]
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    entries: [
      {
        id: 'purpose',
        question: 'What is this system for?',
        answer:
          'The GCGC Team Management System helps your team plan and track work in one place.\n\nYou can organize tasks on boards, manage teams, schedule events on a shared calendar, and keep up with what your teammates are doing.',
        keywords: ['about', 'purpose', 'overview', 'what is'],
      },
      {
        id: 'navigate',
        question: 'How do I navigate the portal?',
        answer:
          'Use the sidebar on the left to move between sections such as your Dashboard, Tasks/Boards, Teams, and Calendar.\n\nOn smaller screens, tap the menu button at the top-left to open the sidebar. Use the search bar at the top to quickly jump to items.',
        keywords: ['menu', 'sidebar', 'navigation', 'move around'],
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks',
    entries: [
      {
        id: 'add-task',
        question: 'How do I add a task?',
        answer:
          'Open a board, then:\n- Click the "Add Task" (+) button on the column where you want the task.\n- Fill in the task title and any details such as assignee, due date, and description.\n- Save — the task appears on the board and the assignee is notified.',
        keywords: ['create task', 'new task', 'add card'],
      },
      {
        id: 'task-status',
        question: "How do I change a task's status?",
        answer:
          'Drag the task card from one column to another (for example, from "To Do" to "In Progress" to "Done").\n\nYou can also open the task and update its status from inside the task details.',
        keywords: ['move task', 'progress', 'kanban', 'drag', 'done'],
      },
      {
        id: 'backlog',
        question: 'What is the Backlog?',
        answer:
          'The Backlog is a hidden archive for each board. Move a task to the Backlog to get it off the active board without deleting it — you can bring it back later when you are ready to work on it.',
        keywords: ['archive', 'hide task', 'later'],
      },
    ],
  },
  {
    id: 'teams-boards',
    title: 'Teams & Boards',
    entries: [
      {
        id: 'create-team',
        question: 'How do I create a team?',
        answer:
          'Go to the Teams section and click "Create Team".\n- Give the team a name.\n- Add members and set their roles (Leader or Member).\n- Save to create the team.\n\nNote: creating and managing teams may require Leader or Admin permissions.',
        keywords: ['new team', 'add team', 'members'],
      },
      {
        id: 'create-board',
        question: 'How do I create a board?',
        answer:
          'From the board switcher, choose "Create Board".\n- Enter a board name.\n- Optionally add a category to group it in your switcher.\n- Save, then start adding tasks to the board.',
        keywords: ['new board', 'kanban board', 'add board'],
      },
      {
        id: 'board-categories',
        question: 'What are board categories?',
        answer:
          'Categories are personal labels you can attach to boards to keep your board switcher organized. They are specific to you — other users will not see your categories. Use the star icon to pin the boards you use most.',
        keywords: ['label', 'group boards', 'organize', 'pin', 'star'],
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar',
    entries: [
      {
        id: 'add-event',
        question: 'How do I add an event?',
        answer:
          'Open the Calendar section and click on a date, or use the "Add Event" button.\n- Enter a title, date, and time.\n- Add any details or invitees.\n- Save to put the event on the calendar.',
        keywords: ['new event', 'schedule', 'meeting', 'create event'],
      },
      {
        id: 'google-sync',
        question: 'How does Google Calendar sync work?',
        answer:
          'Once you connect your Google account, events you create here can be exported to your Google Calendar automatically.\n\nTo pull in changes made in Google, open the calendar — it imports on open — or use the manual sync option.',
        keywords: ['google', 'sync', 'import', 'export', 'integration'],
      },
    ],
  },
]
