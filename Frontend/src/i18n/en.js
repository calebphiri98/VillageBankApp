export default {
  code: 'en',
  name: 'English',

  app: { name: 'Manase Village Bank', tagline: 'Saving together, lending to each other' },

  nav: {
    dashboard: 'Dashboard', savings: 'Savings', loans: 'Loans', members: 'Members',
    people: 'People', meetings: 'Meetings', welfare: 'Welfare fund', fines: 'Fines',
    shareout: 'Share-out', requests: 'Join requests', messages: 'Messages',
    activity: 'Activity log', settings: 'Settings', profile: 'My account',
    cycles: 'Saving cycles', logout: 'Log out', menu: 'Menu', more: 'More',
  },

  roles: { admin: 'Chairlady', treasurer: 'Treasurer', secretary: 'Secretary', member: 'Member' },

  common: {
    save: 'Save', cancel: 'Cancel', close: 'Close', add: 'Add', edit: 'Edit', del: 'Remove',
    search: 'Search', loading: 'Loading…', none: 'Nothing here yet', back: 'Back',
    amount: 'Amount', date: 'Date', name: 'Name', phone: 'Phone number', reason: 'Reason',
    status: 'Status', total: 'Total', actions: 'Actions', notes: 'Notes', yes: 'Yes', no: 'No',
    confirm: 'Are you sure?', sending: 'Sending…', saving: 'Saving…', all: 'All',
    village: 'Village', role: 'Role', language: 'Language', optional: 'optional',
    retry: 'Try again', view: 'View', today: 'Today',
  },

  login: {
    title: 'Log in', subtitle: 'Use the username the chairlady gave you.',
    username: 'Username', password: 'Password', submit: 'Log in',
    forgot: 'I forgot my password', joinPrompt: 'Not in the group yet?', joinLink: 'Ask to join',
    attemptsLeft: (n) => `${n} more ${n === 1 ? 'try' : 'tries'} before this account locks.`,
  },

  forgot: {
    title: 'Reset your password',
    step1: 'Type your username. We will text a code to the phone on your account.',
    step2: 'Type the code from the text message and choose a new password.',
    sendCode: 'Send me a code', code: 'Code from the text message',
    newPassword: 'New password', confirmPassword: 'Type the new password again',
    submit: 'Change my password', resend: 'Send another code',
    backToLogin: 'Back to log in', mismatch: 'The two passwords are not the same.',
  },

  idle: {
    title: 'Still there?',
    body: (s) => `You have not touched the screen for a while. You will be logged out in ${s} seconds.`,
    stay: 'Keep me logged in', out: 'Log out now',
  },

  dashboard: {
    greeting: (name) => `Hello, ${name}`,
    cycleProgress: 'Saving cycle', weeksLeft: (n) => `${n} days until share-out`,
    mySavings: 'What I have saved', myShares: 'Shares', myLoan: 'My loan',
    outstanding: 'Still to repay', dueBy: 'Repay by', noLoan: 'You have no loan right now',
    unpaidFines: 'Unpaid fines', myShare: 'My share this cycle', shareReady: 'Your share is ready to collect',
    nextMeeting: 'Next meeting', noMeeting: 'No meeting has been set',
    totalSavings: 'Total savings', cashInBox: 'Cash in the box', loansOut: 'Money lent out',
    interestEarned: 'Interest earned', welfareBalance: 'Welfare fund', activeMembers: 'Active members',
    pendingLoans: 'Loans waiting for a decision', overdueLoans: 'Overdue loans',
    pendingRequests: 'Women waiting to join', attendanceRate: 'Attendance',
    recentSavings: 'Money received lately', recentActivity: 'What happened lately',
    recentMeetings: 'Recent meetings', smsToday: 'Texts sent today', lockedAccounts: 'Locked accounts',
    finesOutstanding: 'Fines not yet paid',
  },

  savings: {
    title: 'Savings', record: 'Record a saving', member: 'Member', shares: 'Shares',
    recordedBy: 'Recorded by', note: 'Note', thisCycle: 'This cycle',
    empty: 'No savings recorded yet. Record the first one.',
    smsNote: 'She gets a text message confirming the amount.',
  },

  loans: {
    title: 'Loans', apply: 'Apply for a loan', request: 'Request a loan',
    borrower: 'Borrower', principal: 'Amount borrowed', interest: 'Interest',
    withInterest: 'Pay interest on this loan', withInterestHelp:
      'Interest is shared out with the group. If she chooses not to pay interest, she repays only what she borrowed.',
    noInterest: 'No interest', purpose: 'What is the money for?',
    dueDate: 'Repay by', totalDue: 'Total to repay', repaid: 'Repaid', outstanding: 'Still owing',
    approve: 'Approve', reject: 'Turn down', decisionNote: 'Reason (the borrower will see this)',
    recordRepayment: 'Record a repayment', repayments: 'Repayments',
    statementFor: 'Loan statement', remind: 'Send repayment reminders',
    empty: 'No loans yet.', maxAllowed: 'The most she can borrow',
    overdue: 'Overdue', pending: 'Waiting', approved: 'Running', rejected: 'Turned down',
    repaidStatus: 'Cleared', defaulted: 'Not repaid',
  },

  members: {
    title: 'Members', number: 'Member number', joined: 'Joined', savings: 'Saved',
    nextOfKin: 'Next of kin', addPerson: 'Add a person', empty: 'Nobody has been added yet.',
    suspend: 'Suspend', unlock: 'Unlock account', newPassword: 'Give a new password',
    tempPassword: 'Temporary password', writeItDown: 'Write this down. It is only shown once.',
    active: 'Active', inactive: 'Suspended', locked: 'Locked',
  },

  meetings: {
    title: 'Meetings', schedule: 'Set a meeting', when: 'Date', time: 'Time', place: 'Where',
    agenda: 'What will be discussed', minutes: 'What happened', attendance: 'Attendance',
    present: 'Present', absent: 'Absent', excused: 'Excused', markAttendance: 'Mark attendance',
    notify: 'Text everyone about this meeting', empty: 'No meetings recorded yet.',
    presentCount: (n, t) => `${n} of ${t} present`,
  },

  welfare: {
    title: 'Welfare fund', balance: 'Money in the welfare fund',
    contribute: 'Record a contribution', help: 'Give help to a member',
    category: 'What is this for', sickness: 'Sickness', funeral: 'Funeral',
    emergency: 'Emergency', other: 'Something else',
    announce: 'Tell the whole group', announceHelp:
      'Everyone else gets a text so they can visit or attend.',
    contribution: 'Contribution', payout: 'Help given', empty: 'Nothing recorded yet.',
  },

  fines: {
    title: 'Fines', record: 'Record a fine', paid: 'Paid', unpaid: 'Not paid',
    markPaid: 'Mark as paid', collected: 'Collected', empty: 'No fines recorded.',
  },

  shareout: {
    title: 'Share-out', preview: 'Work out the shares', calculate: 'Calculate',
    distribute: 'Hand out and text everyone', breakdown: 'Where the money came from',
    savedByMembers: 'Saved by members', interestCollected: 'Interest collected',
    finesCollected: 'Fines collected', welfareLeft: 'Left in welfare fund',
    profitPot: 'Profit to share', totalFund: 'Total in the box',
    perMember: 'What each member gets', share: 'Her share', deductions: 'Less what she owes',
    profitShare: 'Profit', notShared: 'not shared',
    draftSaved: 'Saved as a draft. Nothing has been handed out yet.',
    openLoans: (n) => `${n} loan(s) are still out. Settle them before sharing out.`,
    confirmDistribute: 'This texts every member her figure. Do it once the money is ready.',
    empty: 'No share-out has been done yet.',
  },

  requests: {
    title: 'Women waiting to join', vote: 'Your vote', voteYes: 'Accept her',
    voteNo: 'Not this cycle', tally: 'Group votes', accept: 'Record: the group accepted',
    decline: 'Record: the group declined', whyJoin: 'Why she wants to join',
    empty: 'No one is waiting to join.', decided: 'Decided',
    groupDecides: 'Every member can vote. A committee member records what the group decided.',
  },

  messages: {
    title: 'Messages', send: 'Send a message', to: 'Send to',
    everyone: 'Everyone in the group', byRole: 'Everyone with one role',
    selected: 'Chosen people', oneNumber: 'One phone number',
    broadcast: 'This goes to the whole group', private: 'This goes to one person only',
    message: 'Message', charsLeft: (n) => `${n} characters left`,
    history: 'Messages sent', sent: 'Sent', failed: 'Did not send', skipped: 'Skipped',
    empty: 'No messages sent yet.', pickPeople: 'Choose who gets it',
    dryRun: 'Test mode is on — messages are written to the server screen, not sent.',
  },

  cycles: {
    title: 'Saving cycles', start: 'Start a new cycle', name: 'Cycle name',
    startDate: 'Starts', endDate: 'Ends', shareValue: 'Value of one share',
    close: 'Close this cycle', running: 'Running', completed: 'Finished',
    oneYear: 'A saving cycle runs for one year.',
  },

  settings: {
    title: 'Group rules',
    loanMultiplier: 'A member may borrow this many times her savings',
    interestRate: 'Interest rate on loans (%)',
    shareInterest: 'Share loan interest at share-out',
    shareFines: 'Share fine money at share-out',
    shareWelfare: 'Share what is left of the welfare fund',
    shareValue: 'Value of one share', welfarePerMeeting: 'Welfare contribution each meeting',
    saved: 'Rules saved.',
  },

  profile: {
    title: 'My account', changePassword: 'Change my password',
    current: 'Current password', newPass: 'New password', confirm: 'Type it again',
    languagePref: 'Language for the screen and for text messages',
    mustChange: 'You are using a temporary password. Please choose your own now.',
  },

  home: {
    heroTitle: 'The box belongs to all of us',
    heroBody:
      'Every week we put in what we can. When someone needs money for seed, school fees or medicine, she borrows from the box and pays it back. At the end of the year we open the box and share everything out.',
    join: 'Ask to join the group', login: 'Log in',
    statMembers: 'women saving', statLoans: 'loans given', statRepaid: 'repaid on time',
    statMeetings: 'meetings held',
    howTitle: 'How the year works',
    step1Title: 'We save every week',
    step1Body: 'Each woman buys shares at every meeting. The secretary and the treasurer both write it down, and you get a text message the same day.',
    step2Title: 'We lend to each other',
    step2Body: 'A member may borrow up to three times what she has saved. She chooses whether to pay interest, and she agrees a date to pay it back before the year ends.',
    step3Title: 'We share everything out',
    step3Body: 'At the end of the cycle the box is emptied. Each woman gets back what she saved plus her part of the profit, and everyone is texted her amount.',
    joinTitle: 'Ask to join',
    joinBody: 'Fill this in and the group will talk about it at the next meeting. Someone will text you either way.',
    joinName: 'Your full name', joinPhone: 'Your phone number',
    joinVillage: 'Your village', joinReason: 'Why do you want to join?',
    joinSubmit: 'Send my request',
    joinDone: 'Your request has been sent. The group will talk about it at the next meeting.',
  },

  errors: {
    generic: 'Something went wrong. Please try again.',
    offline: 'Cannot reach the server. Check that the backend is running.',
    sessionExpired: 'Your session ended. Please log in again.',
    notAllowed: 'Your role cannot open that page.',
    notFound: 'That page does not exist.',
  },
};
