import { useLocation } from "wouter";
import { Bird } from "lucide-react";

export default function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-lg font-bold text-gray-800 tracking-tight hover:text-teal-600 transition-colors">
            <Bird className="w-5 h-5 text-teal-600" /> Aviary Manager
          </button>
          <button onClick={() => setLocation("/")} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← Back</button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: March 2026</p>

        <p className="text-gray-600 leading-relaxed">
          These Terms of Service ("Terms") govern your use of Aviary Manager ("Service", "we", "us"). By creating an account or using the Service, you agree to these Terms.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. The Service</h2>
        <p className="text-gray-600 leading-relaxed">
          Aviary Manager is a web-based aviary management platform. We provide tools to track birds, breeding pairs, broods, events, pedigrees, and related data. The Service is provided on an "as is" basis.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Accounts</h2>
        <p className="text-gray-600 leading-relaxed">
          You must provide a valid email address and keep your login credentials secure. You are responsible for all activity under your account. You must be at least 16 years old to use the Service.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Subscriptions & Billing</h2>
        <p className="text-gray-600 leading-relaxed">
          Paid plans are billed in US dollars (USD) via Stripe. Monthly and yearly subscriptions renew automatically until cancelled. A 7-day trial is offered on all new accounts — no card required. After 7 days, a subscription is required to continue full access. Lifetime plans are a one-time payment with no recurring fees.
        </p>
        <p className="text-gray-600 leading-relaxed mt-2">
          You may cancel your subscription at any time via the billing portal. Cancellations take effect at the end of the current billing period. We do not offer refunds for partial billing periods except where required by law.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Refund Policy</h2>
        <p className="text-gray-600 leading-relaxed">
          If you are unsatisfied with the Service within the first 14 days of a paid subscription (excluding trial periods), contact us at <a href="mailto:aviarymanager@icloud.com" className="text-teal-600 underline">aviarymanager@icloud.com</a> and we will issue a full refund. After 14 days, refunds are at our discretion.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Your Data</h2>
        <p className="text-gray-600 leading-relaxed">
          You retain ownership of all data you enter into the Service. We do not sell your data to third parties. See our <button onClick={() => setLocation("/privacy")} className="text-teal-600 underline hover:text-teal-700">Privacy Policy</button> for full details on how we handle your data.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Acceptable Use</h2>
        <p className="text-gray-600 leading-relaxed">
          You agree not to misuse the Service, attempt to gain unauthorised access, or use automated tools to scrape or abuse the platform. We reserve the right to suspend accounts that violate these Terms.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Limitation of Liability</h2>
        <p className="text-gray-600 leading-relaxed">
          To the extent permitted by law, Aviary Manager is not liable for indirect, incidental, or consequential damages arising from your use of the Service. Our total liability is limited to the amount you paid in the 12 months preceding any claim.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Changes to Terms</h2>
        <p className="text-gray-600 leading-relaxed">
          We may update these Terms from time to time. We will notify you via email for material changes. Continued use of the Service after changes constitutes acceptance.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Governing Law</h2>
        <p className="text-gray-600 leading-relaxed">
          These Terms are governed by the laws of Queensland, Australia. Any disputes will be resolved in the courts of Queensland.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Contact</h2>
        <p className="text-gray-600 leading-relaxed">
          Questions about these Terms? Email us at <a href="mailto:aviarymanager@icloud.com" className="text-teal-600 underline">aviarymanager@icloud.com</a>.
        </p>
      </main>

      <footer className="bg-gray-900 text-gray-400 px-6 py-8 text-center text-sm mt-16">
        <p>© {new Date().getFullYear()} Aviary Manager. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <button onClick={() => setLocation("/terms")} className="hover:text-white transition-colors">Terms</button>
          <button onClick={() => setLocation("/privacy")} className="hover:text-white transition-colors">Privacy</button>
          <a href="mailto:aviarymanager@icloud.com" className="hover:text-white transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}
