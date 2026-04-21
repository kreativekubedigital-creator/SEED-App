import { Plan } from "./types";

export const DEFAULT_PLANS: Plan[] = [
  {
    id: "free",
    name: "Freemium",
    price: 0,
    studentLimit: 50,
    features: ["Basic Dashboards", "Announcements", "Results (Manual)"]
  },
  {
    id: "basic",
    name: "Basic",
    price: 5000,
    studentLimit: 200,
    features: ["Everything in Free", "Quizzes & Tests", "Assignments"]
  },
  {
    id: "premium",
    name: "Premium",
    price: 15000,
    studentLimit: 1000,
    features: ["Everything in Basic", "Revision Hub", "Graduation Album", "Priority Support"]
  }
];

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];
