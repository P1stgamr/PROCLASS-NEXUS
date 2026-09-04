export type McqSubjectGroup = "Language" | "Science" | "Business" | "Humanities" | "Religion" | "Technical" | "General";

export type McqSubject = {
  id: string;
  label: string;
  group: McqSubjectGroup;
  aliases?: string[];
};

export const MCQ_SUBJECTS: McqSubject[] = [
  { id: "bangla_1st", label: "বাংলা ১ম পত্র", group: "Language", aliases: ["bangla 1st", "bangla first", "bangla 1st paper", "বাংলা প্রথম পত্র"] },
  { id: "bangla_2nd", label: "বাংলা ২য় পত্র", group: "Language", aliases: ["bangla 2nd", "bangla second", "bangla 2nd paper", "বাংলা দ্বিতীয় পত্র"] },
  { id: "english_1st", label: "English 1st Paper", group: "Language", aliases: ["english 1st", "english first", "english first paper"] },
  { id: "english_2nd", label: "English 2nd Paper", group: "Language", aliases: ["english 2nd", "english second", "english second paper"] },
  { id: "math", label: "সাধারণ গণিত", group: "Science", aliases: ["mathematics", "general math", "general mathematics"] },
  { id: "higher_math", label: "উচ্চতর গণিত", group: "Science", aliases: ["higher math", "higher mathematics"] },
  { id: "physics", label: "পদার্থবিজ্ঞান", group: "Science", aliases: ["physics"] },
  { id: "chemistry", label: "রসায়ন", group: "Science", aliases: ["chemistry"] },
  { id: "biology", label: "জীববিজ্ঞান", group: "Science", aliases: ["biology"] },
  { id: "general_science", label: "সাধারণ বিজ্ঞান", group: "Science", aliases: ["general science", "science"] },
  { id: "ict", label: "তথ্য ও যোগাযোগ প্রযুক্তি", group: "Technical", aliases: ["ict", "information and communication technology"] },
  { id: "accounting", label: "হিসাববিজ্ঞান", group: "Business", aliases: ["accounting"] },
  { id: "finance_banking", label: "ফিন্যান্স ও ব্যাংকিং", group: "Business", aliases: ["finance", "finance and banking", "finance banking"] },
  { id: "business_entrepreneurship", label: "ব্যবসায় উদ্যোগ", group: "Business", aliases: ["business entrepreneurship", "business studies", "entrepreneurship"] },
  { id: "economics", label: "অর্থনীতি", group: "Business", aliases: ["economics"] },
  { id: "statistics", label: "পরিসংখ্যান", group: "Business", aliases: ["statistics"] },
  { id: "history_bangladesh_world", label: "বাংলাদেশ ও বিশ্বপরিচয় / ইতিহাস", group: "Humanities", aliases: ["history", "bangladesh and global studies", "bangladesh world"] },
  { id: "civics_citizenship", label: "পৌরনীতি ও নাগরিকতা", group: "Humanities", aliases: ["civics", "civics and citizenship"] },
  { id: "geography_environment", label: "ভূগোল ও পরিবেশ", group: "Humanities", aliases: ["geography", "geography and environment"] },
  { id: "sociology", label: "সমাজবিজ্ঞান", group: "Humanities", aliases: ["sociology"] },
  { id: "social_work", label: "সমাজকর্ম", group: "Humanities", aliases: ["social work"] },
  { id: "logic", label: "যুক্তিবিদ্যা", group: "Humanities", aliases: ["logic"] },
  { id: "psychology", label: "মনোবিজ্ঞান", group: "Humanities", aliases: ["psychology"] },
  { id: "religion_islam", label: "ইসলাম ও নৈতিক শিক্ষা", group: "Religion", aliases: ["islam", "islam and moral education"] },
  { id: "religion_hindu", label: "হিন্দুধর্ম ও নৈতিক শিক্ষা", group: "Religion", aliases: ["hindu religion", "hinduism"] },
  { id: "religion_buddhism", label: "বৌদ্ধধর্ম ও নৈতিক শিক্ষা", group: "Religion", aliases: ["buddhism", "buddhist religion"] },
  { id: "religion_christianity", label: "খ্রিস্টধর্ম ও নৈতিক শিক্ষা", group: "Religion", aliases: ["christianity", "christian religion"] },
  { id: "agriculture_studies", label: "কৃষিশিক্ষা", group: "Technical", aliases: ["agriculture", "agriculture studies"] },
  { id: "home_science", label: "গার্হস্থ্য বিজ্ঞান", group: "Technical", aliases: ["home science", "home economics"] },
  { id: "career_education", label: "ক্যারিয়ার শিক্ষা", group: "Technical", aliases: ["career education"] },
  { id: "computer_science", label: "কম্পিউটার বিজ্ঞান", group: "Technical", aliases: ["computer science"] },
  { id: "python", label: "Python", group: "Technical", aliases: ["python"] },
  { id: "js", label: "JavaScript", group: "Technical", aliases: ["javascript", "js"] },
  { id: "cpp", label: "C++", group: "Technical", aliases: ["c++", "cpp"] },
  { id: "english", label: "English (General)", group: "Language", aliases: ["english"] },
  { id: "gk", label: "সাধারণ জ্ঞান", group: "General", aliases: ["general knowledge", "gk"] },
];

export const MCQ_SUBJECT_LABELS = Object.fromEntries(MCQ_SUBJECTS.map((subject) => [subject.id, subject.label])) as Record<string, string>;

export function normalizeMcqSubject(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  const subject = MCQ_SUBJECTS.find((item) => item.id === normalized || item.label.toLowerCase() === normalized || item.aliases?.some((alias) => alias.toLowerCase() === normalized));
  return subject?.id || "gk";
}