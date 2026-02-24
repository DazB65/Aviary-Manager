import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  Bird, Egg, Heart, TreePine, CalendarDays, FileText,
  Check, Star, ChevronRight, Dna, Users
} from "lucide-react";

const FEATURES = [
  {
    icon: Bird,
    color: "bg-teal-100 text-teal-700",
    title: "Bird Registry",
    desc: "Track every bird with ring ID, species, gender, date of birth, cage number, colour mutation, and photo.",
  },
  {
    icon: Heart,
    color: "bg-rose-100 text-rose-700",
    title: "Breeding Pairs",
    desc: "Pair birds together, track pairing dates, and manage active vs. retired pairs at a glance.",
  },
  {
    icon: Egg,
    color: "bg-amber-100 text-amber-700",
    title: "Brood & Egg Tracking",
    desc: "Log eggs laid, auto-calculate fertility check and hatch dates based on species incubation periods.",
  },
  {
    icon: TreePine,
    color: "bg-violet-100 text-violet-700",
    title: "5-Generation Pedigree",
    desc: "Visualise lineage up to 5 generations. Detect siblings and calculate inbreeding coefficients.",
  },
  {
    icon: Dna,
    color: "bg-sky-100 text-sky-700",
    title: "Inbreeding Detection",
    desc: "Get live inbreeding coefficient warnings when pairing birds so you can make informed decisions.",
  },
  {
    icon: CalendarDays,
    color: "bg-orange-100 text-orange-700",
    title: "Events & Reminders",
    desc: "Schedule vet visits, band changes, medication reminders, and weaning dates for any bird or pair.",
  },
  {
    icon: FileText,
    color: "bg-emerald-100 text-emerald-700",
    title: "PDF Pedigree Export",
    desc: "Export a formatted 5-generation pedigree certificate — perfect for show registration or vet records.",
  },
  {
    icon: Users,
    color: "bg-pink-100 text-pink-700",
    title: "36 Species Pre-loaded",
    desc: "Canaries, finches, parakeets, cockatiels, lovebirds, and more — all with incubation periods and care data.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Canary breeder, QLD",
    text: "Finally a breeding app that actually understands aviculture. The pedigree tree alone is worth it.",
    stars: 5,
  },
  {
    name: "James T.",
    role: "Finch & parrot keeper, VIC",
    text: "The inbreeding calculator has saved me from some bad pairings. Brilliant tool.",
    stars: 5,
  },
  {
    name: "Linda K.",
    role: "Cockatiel breeder, NSW",
    text: "I used to manage everything in spreadsheets. This is so much better. The egg tracking is fantastic.",
    stars: 5,
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-sm">
              <Bird className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Aviary Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLocation("/login")} className="text-gray-600">
              Sign in
            </Button>
            <Button onClick={() => setLocation("/register")} className="bg-teal-600 hover:bg-teal-700 text-white">
              Get started free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-amber-50 to-rose-50 px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-teal-100 text-teal-700 border-teal-200 text-sm px-4 py-1">
            🦜 Built for aviary owners, by aviary owners
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            The smarter way to manage your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-amber-500">
              aviary
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Track birds, breeding pairs, eggs, and pedigrees — all in one place.
            Auto-calculate hatch dates, detect inbreeding, and export pedigree certificates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              className="bg-teal-600 hover:bg-teal-700 text-white text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Start for free <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
              className="text-base px-8 py-6 rounded-xl border-2"
            >
              Sign in
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-400">Free plan available. No credit card required.</p>
        </div>

        {/* Decorative birds */}
        <div className="absolute top-10 left-10 text-6xl opacity-10 rotate-[-15deg]">🦜</div>
        <div className="absolute bottom-10 right-10 text-5xl opacity-10 rotate-[10deg]">🐦</div>
        <div className="absolute top-1/2 left-4 text-4xl opacity-5">🥚</div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything your aviary needs
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From hatchling to show bird — manage the full lifecycle of every bird in your collection.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <Card key={f.title} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24 bg-gradient-to-br from-gray-50 to-teal-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, honest pricing</h2>
            <p className="text-lg text-gray-500">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <Card className="border-2 border-gray-200 rounded-2xl">
              <CardContent className="pt-8 pb-8 px-8">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Free</h3>
                <p className="text-gray-500 text-sm mb-6">Great for getting started</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">$0</span>
                  <span className="text-gray-400 ml-1">/ forever</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["Up to 20 birds", "Up to 5 breeding pairs", "Up to 10 broods", "3-gen pedigree view", "Event reminders"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-gray-400" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={() => setLocation("/register")}>
                  Get started free
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-2 border-teal-500 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                ⭐ Most Popular
              </div>
              <CardContent className="pt-8 pb-8 px-8">
                <h3 className="text-xl font-bold text-teal-700 mb-1">Pro</h3>
                <p className="text-gray-500 text-sm mb-6">For serious breeders</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">$7.99</span>
                  <span className="text-gray-400 ml-1">/ month</span>
                  <div className="text-sm text-teal-600 font-medium mt-1">or $79/year (save 17%)</div>
                </div>
                <ul className="space-y-3 mb-8">
                  {["Unlimited birds & pairs", "5-gen pedigree tree", "Inbreeding coefficient", "Sibling detection", "PDF pedigree export", "Photo uploads", "Priority support"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-teal-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setLocation("/register")}>
                  Start free, upgrade anytime
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Loved by breeders</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(t => (
              <Card key={t.name} className="border border-gray-100 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-gradient-to-br from-teal-600 to-teal-800 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Bird className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to take control of your aviary?</h2>
          <p className="text-teal-100 text-lg mb-8">Join breeders who are already saving time and keeping better records.</p>
          <Button
            size="lg"
            onClick={() => setLocation("/register")}
            className="bg-white text-teal-700 hover:bg-teal-50 text-base px-10 py-6 rounded-xl font-semibold shadow-lg"
          >
            Create your free account <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-10 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
            <Bird className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold">Aviary Manager</span>
        </div>
        <p>© {new Date().getFullYear()} Aviary Manager. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-4">
          <button onClick={() => setLocation("/login")} className="hover:text-white transition-colors">Sign in</button>
          <button onClick={() => setLocation("/register")} className="hover:text-white transition-colors">Register</button>
        </div>
      </footer>
    </div>
  );
}
