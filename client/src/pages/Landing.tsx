import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  Bird, Egg, Heart, TreePine, CalendarDays, FileText,
  Check, Star, ChevronRight, Dna, Users, Menu, X
} from "lucide-react";

// Item 8: All icons use teal brand palette (alternating two tints)
const FEATURES = [
  {
    icon: Bird,
    color: "bg-teal-100 text-teal-700",
    title: "Bird Registry",
    desc: "Track every bird with ring ID, species, gender, date of birth, cage number, colour mutation, and photo.",
  },
  {
    icon: Heart,
    color: "bg-teal-50 text-teal-600",
    title: "Breeding Pairs",
    desc: "Pair birds together, track pairing dates, and manage active vs. retired pairs at a glance.",
  },
  {
    icon: Egg,
    color: "bg-teal-100 text-teal-700",
    title: "Brood & Egg Tracking",
    desc: "Log eggs laid, auto-calculate fertility check and hatch dates based on species incubation periods.",
  },
  {
    icon: TreePine,
    color: "bg-teal-50 text-teal-600",
    title: "4-Generation Pedigree",
    desc: "Visualise lineage up to 4 generations. Detect siblings and calculate inbreeding coefficients.",
  },
  {
    icon: Dna,
    color: "bg-teal-100 text-teal-700",
    title: "Inbreeding Detection",
    desc: "Get live inbreeding coefficient warnings when pairing birds so you can make informed decisions.",
  },
  {
    icon: CalendarDays,
    color: "bg-teal-50 text-teal-600",
    title: "Events & Reminders",
    desc: "Schedule vet visits, band changes, medication reminders, and weaning dates for any bird or pair.",
  },
  {
    icon: FileText,
    color: "bg-teal-100 text-teal-700",
    title: "PDF Pedigree Export",
    desc: "Export a formatted 4-generation pedigree certificate — perfect for show registration or vet records.",
  },
  {
    icon: Users,
    color: "bg-teal-50 text-teal-600",
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-lg font-bold text-gray-800 tracking-tight">Aviary Manager</span>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLocation("/login")} className="text-gray-600 min-h-[44px] transition-colors hover:text-gray-900">
              Sign in
            </Button>
            <Button onClick={() => setLocation("/register")} className="bg-teal-600 hover:bg-teal-700 text-white min-h-[44px] transition-colors">
              Start free trial
            </Button>
          </div>

          {/* Item 15: Mobile hamburger (confirmed present) */}
          <button
            className="sm:hidden flex items-center justify-center w-11 h-11 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 mt-3 pt-3 pb-2 flex flex-col gap-2">
            <button
              onClick={() => { setMenuOpen(false); setLocation("/login"); }}
              className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px] flex items-center"
            >
              Sign in
            </button>
            <button
              onClick={() => { setMenuOpen(false); setLocation("/register"); }}
              className="w-full text-left px-4 py-3 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors min-h-[44px] flex items-center"
            >
              Start free trial
            </button>
          </div>
        )}
      </nav>

      {/* Hero — Item 7: py-20 (80px), Item 13: badge mb-3 anchored close to headline */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-amber-50 to-rose-50 px-6 py-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* Big logo — left */}
          <div className="flex-shrink-0 flex justify-center md:justify-start md:-ml-8">
            <img
              src="/logo.svg"
              alt="Aviary Manager"
              className="w-72 md:w-96 h-auto drop-shadow-xl"
            />
          </div>

          {/* Content — right */}
          <div className="flex-1 text-center md:text-left">
            {/* Item 13: badge anchored ~12px above headline */}
            <Badge className="mb-3 bg-teal-100 text-teal-700 border-teal-200 text-sm px-4 py-1">
              Built for aviary owners, by aviary owners
            </Badge>
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              The smarter way to manage your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-amber-500">
                Aviary
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mb-10">
              Track birds, breeding pairs, eggs, and pedigrees — all in one place.
              Auto-calculate hatch dates, detect inbreeding, and export pedigree certificates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              {/* Item 10: hover state with shadow + transition */}
              <Button
                size="lg"
                onClick={() => setLocation("/register")}
                className="bg-teal-600 hover:bg-teal-700 text-white text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Start free trial <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/login")}
                className="text-base px-8 py-6 rounded-xl border-2 hover:bg-gray-50 transition-all duration-200"
              >
                Sign in
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-400">7-day free trial — no card required. Subscribe on day 8 to keep full access.</p>
          </div>
        </div>
      </section>

      {/* Features — Item 7: py-20, Item 9: stronger shadow, Item 10: hover lift */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything your aviary needs
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From hatchling to show bird — manage the full lifecycle of every bird in your collection.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <Card
                key={f.title}
                className="border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-200"
              >
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

      {/* Pricing — Item 7: py-20, Item 11: equal height cards, Item 12: badges inside cards */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-teal-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, honest pricing</h2>
            <p className="text-lg text-gray-500">Try free for 7 days. Card required — no charge until day 8.</p>
          </div>
          {/* Item 11: items-stretch so both cards fill equal height */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
            {/* Pro */}
            <Card className="border-2 border-teal-500 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col">
              <CardContent className="pt-6 pb-8 px-8 flex flex-col flex-1">
                {/* Item 12: badge inside card at top */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-teal-700">Pro</h3>
                  <span className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ⭐ Most Popular
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-1">For serious breeders</p>
                <p className="text-teal-600 text-sm font-medium mb-6">7-day free trial included</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">$8.80</span>
                  <span className="text-gray-400 ml-1">AUD / month</span>
                  <div className="text-sm text-teal-600 font-medium mt-1">or $88 AUD/year (save 2 months)</div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["Unlimited birds & pairs", "4-gen pedigree tree", "Inbreeding coefficient", "Sibling detection", "PDF pedigree export", "Photo uploads", "Priority support"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-teal-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {/* Item 11: button anchored to bottom */}
                <div className="mt-auto">
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white transition-colors duration-200"
                    onClick={() => setLocation("/register")}
                  >
                    Start 7-day free trial
                  </Button>
                  <p className="text-xs text-center text-gray-400 mt-3">Have a coupon? Apply it at checkout for a forever discount.</p>
                </div>
              </CardContent>
            </Card>

            {/* Lifetime */}
            <Card className="border-2 border-amber-400 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col">
              <CardContent className="pt-6 pb-8 px-8 flex flex-col flex-1">
                {/* Item 12: badge inside card at top */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-amber-700">Lifetime</h3>
                  <span className="bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                    🏆 Best Value
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Pay once, own it forever</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">$220</span>
                  <span className="text-gray-400 ml-1">AUD / once</span>
                  <div className="text-sm text-amber-600 font-medium mt-1">Never pay again</div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["Everything in Pro", "Lifetime updates", "No recurring fees", "Priority support"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-amber-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {/* Item 11: button anchored to bottom */}
                <div className="mt-auto">
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white transition-colors duration-200"
                    onClick={() => setLocation("/register")}
                  >
                    Get lifetime access
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials — Item 7: py-20, Item 9: shadow, Item 14: italic, quote mark, cream bg */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Loved by breeders</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(t => (
              <Card
                key={t.name}
                className="border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-amber-50/40"
              >
                <CardContent className="pt-6 relative">
                  {/* Item 14: large decorative opening quote */}
                  <span
                    className="absolute top-4 left-5 text-7xl font-serif leading-none text-teal-500 select-none pointer-events-none"
                    style={{ opacity: 0.15 }}
                    aria-hidden="true"
                  >
                    "
                  </span>
                  <div className="flex gap-1 mb-3 relative">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  {/* Item 14: italic quote text */}
                  <p className="text-gray-700 text-sm leading-relaxed mb-4 italic relative">"{t.text}"</p>
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

      {/* CTA — Item 7: py-20 */}
      <section className="px-6 py-20 bg-gradient-to-br from-teal-600 to-teal-800 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to take control of your aviary?</h2>
          <p className="text-teal-100 text-lg mb-8">Join breeders who are already saving time and keeping better records.</p>
          <Button
            size="lg"
            onClick={() => setLocation("/register")}
            className="bg-white text-teal-700 hover:bg-teal-50 text-base px-10 py-6 rounded-xl font-semibold shadow-lg transition-all duration-200"
          >
            Start your 7-day free trial <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer — Item 16: multi-column layout */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <span className="text-white font-bold text-lg block mb-2">Aviary Manager</span>
              <p className="text-sm leading-relaxed">
                The smarter way to manage your aviary. Built for breeders, by breeders.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">Account</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => setLocation("/login")} className="hover:text-white transition-colors">Sign in</button>
                </li>
                <li>
                  <button onClick={() => setLocation("/register")} className="hover:text-white transition-colors">Register</button>
                </li>
                <li>
                  <a href="mailto:aviarymanager@icloud.com" className="hover:text-white transition-colors">Contact</a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => setLocation("/terms")} className="hover:text-white transition-colors">Terms of Service</button>
                </li>
                <li>
                  <button onClick={() => setLocation("/privacy")} className="hover:text-white transition-colors">Privacy Policy</button>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright row */}
          <div className="border-t border-gray-800 pt-6 text-center text-xs">
            © {new Date().getFullYear()} Aviary Manager. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
