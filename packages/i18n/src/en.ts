/**
 * English (en) translations — Trevu
 *
 * Structure mirrors hu.ts exactly — every key must exist in both files.
 */
import type { TranslationKeys } from './hu';

const en: TranslationKeys = {
  // ============================================================================
  // Common
  // ============================================================================
  common: {
    appName: "Trevu",
    appTagline: "Trek beyond ordinary",
    loading: "Loading...",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    previous: "Previous",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    all: "All",
    none: "None",
    yes: "Yes",
    no: "No",
    or: "or",
    and: "and",
    ok: "OK",
    confirm: "Confirm",
    required: "Required",
    optional: "Optional",
    enabled: "Enabled",
    disabled: "Disabled",
    comingSoon: "Coming soon",
    noData: "No data",
    showMore: "Show more",
    showLess: "Show less",
    selectPlaceholder: "-- Select --",
    notSpecified: "Not specified",
  },

  // ============================================================================
  // Errors & Notifications
  // ============================================================================
  errors: {
    generic: "Something went wrong. Please try again.",
    networkError: "Network error. Please check your connection.",
    notFound: "Page not found.",
    unauthorized: "You are not authorized to perform this action.",
    forbidden: "Access denied.",
    sessionExpired: "Your session has expired. Please log in again.",
    validationFailed: "Please check the provided data.",
    saveFailed: "Failed to save.",
    loadFailed: "Failed to load data.",
    fileTooLarge: "File is too large. Maximum {max} MB allowed.",
    invalidFormat: "Invalid format.",
  },

  toasts: {
    saveSuccess: "Saved successfully!",
    saveError: "Failed to save.",
    deleteSuccess: "Deleted successfully.",
    deleteError: "Failed to delete.",
    copySuccess: "Copied to clipboard!",
    profileUpdated: "Profile updated!",
    profileUpdateError: "Failed to update profile.",
    privacyUpdated: "Privacy settings updated!",
    privacyUpdateError: "Failed to update privacy settings.",
    skillsUpdated: "Skills updated!",
    interestsUpdated: "Interests updated!",
    emergencyContactSaved: "Emergency contact saved!",
  },

  // ============================================================================
  // Auth
  // ============================================================================
  auth: {
    login: "Log in",
    loginTitle: "Log in",
    loginSubtitle: "Welcome to Trevu",
    loginLoading: "Logging in...",
    loginWithGoogle: "Log in with Google",
    loginWithGoogleLoading: "Logging in...",

    register: "Sign up",
    registerTitle: "Sign up",
    registerSubtitle: "Join the Trevu community",
    registerLoading: "Signing up...",
    registerWithGoogle: "Sign up with Google",
    registerWithGoogleLoading: "Signing up...",

    logout: "Log out",
    logoutConfirm: "Are you sure you want to log out?",

    email: "Email",
    emailPlaceholder: "name@email.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    passwordMin: "Password (min. 6 characters)",
    fullName: "Full name",
    fullNamePlaceholder: "John Smith",

    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",

    forgotPassword: "Forgot your password?",
    resetPassword: "Reset password",
    resetPasswordSent: "Password reset link sent!",

    confirmEmail: "Confirm your email",
    confirmEmailSent: "Confirmation email sent to: {email}",

    termsAgreement: "By signing up, you agree to our",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
  },

  // ============================================================================
  // Landing Page
  // ============================================================================
  landing: {
    heroTitle: "Trevu",
    heroSubtitle: "Plan the perfect adventure. Organize trips, share expenses, and find local guides.",
    ctaRegister: "Sign up",
    ctaLogin: "Log in",
    statusLabel: "MVP Status",
    statusText: "Infrastructure deployed — Supabase + Vercel + Next.js",
  },

  // ============================================================================
  // Dashboard
  // ============================================================================
  dashboard: {
    welcomeMessage: "Welcome, {name}!",
    welcomeDefault: "Adventurer",

    myTrips: "My trips",
    myTripsDescription: "Manage your existing trips",
    newTrip: "New trip",
    newTripDescription: "Create a new adventure",
    expenses: "Expenses",
    guides: "Guides",

    systemStatus: "System status",
    systemStatusText: "MVP infrastructure active — M01 User Management deployed",
  },

  // ============================================================================
  // Profile
  // ============================================================================
  profile: {
    title: "Profile",
    editProfile: "Edit profile",
    defaultUser: "User",

    tabs: {
      overview: "Overview",
      settings: "Settings",
      skills: "Skills",
      privacy: "Privacy",
    },

    overview: {
      memberSince: "Member since {date}",
      followers: "Followers",
      following: "Following",
      trips: "Trips",
      reputationPoints: "Reputation points",
      level: "Level {level}",
      verifiedOrganizer: "Verified organizer",
      adventureInterests: "Adventure interests",
      noInterests: "No adventure interests added yet",
      addInterestsFirst: "Add your adventure interests on the Skills tab first",
      skills: "Skills",
      noSkills: "No skills added yet",
    },

    settings: {
      personalInfo: "Personal information",
      firstName: "First name",
      firstNamePlaceholder: "First name",
      lastName: "Last name",
      lastNamePlaceholder: "Last name",
      phone: "Phone number",
      phonePlaceholder: "Phone number",
      phoneCodePlaceholder: "--",
      city: "City",
      cityPlaceholder: "City",
      country: "Country",
      countryPlaceholder: "-- Select country --",
      preferredLanguage: "Preferred language",
      languagePlaceholder: "-- Select language --",
      preferredCurrency: "Preferred currency",
      currencyPlaceholder: "-- Select currency --",
      timezone: "Timezone",
      timezonePlaceholder: "-- Select timezone --",
      bio: "About me",
      bioPlaceholder: "Tell us a bit about yourself...",
      bioCharCount: "{count}/500 characters",
      saveChanges: "Save changes",
    },

    emergency: {
      title: "Emergency contact",
      name: "Name",
      namePlaceholder: "Name",
      phone: "Phone number",
      phonePlaceholder: "Phone number",
      relationship: "Relationship",
      isPrimary: "Primary contact",
      relationships: {
        spouse: "Spouse",
        parent: "Parent",
        sibling: "Sibling",
        friend: "Friend",
        other: "Other",
      },
    },

    skills: {
      title: "Skills & interests",
      adventureInterests: "Adventure interests",
      editInterests: "Edit",
      saveInterests: "Save",
      skillLevel: "Skill level",
      saveSkills: "Save skills",
      noCategory: "Select a category to set your skill level",
    },

    skillLevels: {
      any: "Any",
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      expert: "Expert",
    },

    privacy: {
      title: "Privacy settings",
      saveChanges: "Save privacy settings",
      profileVisibility: "Profile visibility",
      emailVisibility: "Email visibility",
      phoneVisibility: "Phone number visibility",
      locationPrecision: "Location precision",
      tripHistoryVisibility: "Trip history visibility",
      onlineStatus: "Online status visibility",
      options: {
        public: "Public",
        registered: "Registered users only",
        private: "Private",
        hidden: "Hidden",
        followersOnly: "Followers only",
        tripCompanionsOnly: "Trip companions only",
        cityCountry: "City and country",
        countryOnly: "Country only",
      },
    },

    subscriptionTiers: {
      free: "Adventurer (free)",
      pro: "Guide (€9.90/mo)",
      business: "Expedition (€39.90/mo)",
      enterprise: "Base Camp (custom)",
    },
  },

  // ============================================================================
  // Trips (M02)
  // ============================================================================
  trips: {
    title: "Trips",
    createTrip: "Create new trip",
    editTrip: "Edit trip",
    deleteTrip: "Delete trip",
    publishTrip: "Publish trip",
    myTrips: "My trips",
    discover: "Discover",

    status: {
      draft: "Draft",
      published: "Published",
      registrationOpen: "Registration open",
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
      archived: "Archived",
    },

    wizard: {
      stepCategory: "Category",
      stepBasicInfo: "Basic info",
      stepDetails: "Details",
      stepPublish: "Publish",
    },

    fields: {
      title: "Trip name",
      description: "Description",
      category: "Category",
      startDate: "Start date",
      endDate: "End date",
      location: "Location",
      country: "Country",
      region: "Region",
      city: "City",
      difficulty: "Difficulty",
      maxParticipants: "Max participants",
      minParticipants: "Min participants",
      price: "Price",
      currency: "Currency",
      language: "Trip language",
      meetingPoint: "Meeting point",
    },

    difficulty: {
      1: "Easy",
      2: "Moderately difficult",
      3: "Moderate",
      4: "Hard",
      5: "Very hard",
    },

    participantStatus: {
      pending: "Pending",
      approved: "Approved",
      approvedPendingPayment: "Approved, awaiting payment",
      participant: "Participant",
      rejected: "Rejected",
      waitlisted: "Waitlisted",
      cancelled: "Cancelled",
    },
  },

  // ============================================================================
  // Categories
  // ============================================================================
  categories: {
    hiking: "Hiking",
    mountaineering: "Mountaineering",
    waterSports: "Water Sports",
    motorsport: "Motorsport",
    cycling: "Cycling",
    running: "Running",
    winterSports: "Winter Sports",
    expedition: "Expedition",
  },

  // ============================================================================
  // Expenses (M03)
  // ============================================================================
  expenses: {
    title: "Expenses",
    addExpense: "Add expense",
    totalExpenses: "Total expenses",
    yourBalance: "Your balance",
    youOwe: "You owe",
    owedToYou: "Owed to you",
    settle: "Settle",
    splitType: {
      equal: "Equal",
      custom: "Custom",
      percentage: "Percentage",
    },
    categories: {
      foodDrinks: "Food & drinks",
      accommodation: "Accommodation",
      transportFuel: "Transport & fuel",
      activities: "Activities",
      gearEquipment: "Gear & equipment",
      marinaBerth: "Marina/berth",
    },
    offlineNotice: "Saved offline. Will sync when connection is restored.",
  },

  // ============================================================================
  // Metadata & SEO
  // ============================================================================
  metadata: {
    title: "Trevu — Trek beyond ordinary",
    description: "Plan the perfect adventure — organize trips, share expenses, find local guides",
    keywords: "adventure, trip, travel, expense sharing, guide, trekking, outdoor",
  },

  // ============================================================================
  // Date & Time
  // ============================================================================
  dateTime: {
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    daysAgo: "{count} days ago",
    hoursAgo: "{count} hours ago",
    minutesAgo: "{count} minutes ago",
    justNow: "Just now",
    months: {
      jan: "January",
      feb: "February",
      mar: "March",
      apr: "April",
      may: "May",
      jun: "June",
      jul: "July",
      aug: "August",
      sep: "September",
      oct: "October",
      nov: "November",
      dec: "December",
    },
    daysOfWeek: {
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday",
    },
  },

  // ============================================================================
  // Validation messages
  // ============================================================================
  validation: {
    required: "This field is required",
    emailInvalid: "A valid email is required",
    passwordMin: "Minimum {min} characters required",
    nameMin: "Minimum {min} characters required",
    maxLength: "Maximum {max} characters allowed",
    numberMin: "Minimum value: {min}",
    numberMax: "Maximum value: {max}",
    invalidCountryCode: "Invalid country code",
    invalidCurrencyCode: "Invalid currency code",
    invalidLanguageCode: "Invalid language code",
    invalidTimezone: "Invalid timezone",
    invalidPhone: "A valid international phone number is required (e.g. +36201234567)",
    dateInPast: "Date cannot be in the past",
    endBeforeStart: "End date cannot be before start date",
  },
} as const;

export default en;
