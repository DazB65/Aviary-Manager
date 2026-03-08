import { Bird } from "lucide-react";

export function GenderIcon({
    gender,
    className = "w-4 h-4"
}: {
    gender?: string | null;
    className?: string
}) {
    if (gender === "male") {
        return <Bird className={`text-blue-500 ${className}`} />;
    }
    if (gender === "female") {
        return <Bird className={`text-rose-500 ${className}`} />;
    }
    return <Bird className={`text-slate-400 ${className}`} />;
}
