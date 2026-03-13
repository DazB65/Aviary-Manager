import { useLocation } from "wouter";
import { Bird } from "lucide-react";

export default function Privacy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: March 2026</p>

        <p className="text-gray-600 leading-relaxed">
          Aviary Manager ("we", "us") is committed to protecting your personal information in accordance with the Australian Privacy Act 1988 and the Australian Privacy Principles (APPs). This policy explains what we collect, how we use it, and your rights.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. What We Collect</h2>
        <p className="text-gray-600 leading-relaxed">We collect the following information when you use our Service:</p>
        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
          <li><strong>Account data:</strong> name, email address, password (stored as a hash)</li>
          <li><strong>Aviary data:</strong> birds, pairs, broods, events, and other records you create</li>
          <li><strong>Billing data:</strong> subscription status and Stripe customer ID (card details are handled by Stripe, not stored by us)</li>
          <li><strong>Usage data:</strong> page views via Umami (anonymised, no cookies), and AI chat usage counts</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. How We Use Your Data</h2>
        <p className="text-gray-600 leading-relaxed">We use your data to:</p>
        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
          <li>Provide and improve the Service</li>
          <li>Manage your account and subscription</li>
          <li>Send transactional emails (email verification, password reset)</li>
          <li>Respond to support requests</li>
          <li>Monitor usage for security and abuse prevention</li>
        </ul>
        <p className="text-gray-600 leading-relaxed mt-3">We do not sell your data to third parties. We do not use your aviary data for advertising.</p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Third-Party Services</h2>
        <p className="text-gray-600 leading-relaxed">We use the following third-party services, each with their own privacy policies:</p>
        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
          <li><strong>Stripe</strong> — payment processing. Card data never touches our servers.</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>OpenAI</strong> — AI chat feature. Queries are sent to OpenAI; do not include sensitive personal information in chat.</li>
          <li><strong>Umami</strong> — privacy-first analytics (no cookies, no cross-site tracking)</li>
          <li><strong>Railway</strong> — hosting and database infrastructure</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Data Storage & Security</h2>
        <p className="text-gray-600 leading-relaxed">
          Your data is stored in a PostgreSQL database hosted on Railway in their cloud infrastructure. We use HTTPS for all data in transit. Passwords are hashed using bcrypt and never stored in plain text. We implement rate limiting and session security to protect your account.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Data Retention</h2>
        <p className="text-gray-600 leading-relaxed">
          We retain your data for as long as your account is active. If you delete your account, all your data (birds, pairs, broods, events, settings) is permanently deleted immediately. Stripe may retain billing records as required by law.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Your Rights</h2>
        <p className="text-gray-600 leading-relaxed">Under the Australian Privacy Act, you have the right to:</p>
        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your data (via account deletion in Settings → Billing)</li>
          <li>Complain to the Office of the Australian Information Commissioner (OAIC) if you believe we have breached the APPs</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Cookies</h2>
        <p className="text-gray-600 leading-relaxed">
          We use a single session cookie to keep you logged in. Our analytics (Umami) are cookie-free. We do not use advertising or tracking cookies.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Children</h2>
        <p className="text-gray-600 leading-relaxed">
          The Service is not directed at children under 16. We do not knowingly collect data from children.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Changes to This Policy</h2>
        <p className="text-gray-600 leading-relaxed">
          We may update this policy from time to time. We will notify you by email for material changes. Continued use of the Service after changes constitutes acceptance.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Contact</h2>
        <p className="text-gray-600 leading-relaxed">
          For any privacy questions or data requests, contact us at <a href="mailto:aviarymanager@icloud.com" className="text-teal-600 underline">aviarymanager@icloud.com</a>.
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

