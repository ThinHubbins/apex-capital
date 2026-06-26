"use client";

import Link from "next/link";
import Navbar from "../../components/Navbar";

const sections = [
  {
    title: "Acceptance of Terms",
    content: [
      "By creating an account or using any part of the Apex Capital platform, you agree to be bound by these Terms of Service.",
      "If you do not agree with any part of these terms, you must not use the platform.",
      "We may update these terms from time to time. Continued use of the platform after changes are posted constitutes your acceptance of the revised terms.",
    ],
  },
  {
    title: "Eligibility",
    content: [
      "You must be at least 18 years old and legally permitted to invest in your jurisdiction to use Apex Capital.",
      "By registering, you confirm that all information you provide is accurate, current, and complete.",
      "We reserve the right to suspend or terminate accounts where eligibility requirements are not met.",
    ],
  },
  {
    title: "Investment Risk Disclosure",
    content: [
      "All investments carry risk. The value of your portfolio can go down as well as up, and you may get back less than you invest.",
      "Past performance shown on this platform is not a reliable indicator of future results.",
      "Apex Capital does not provide personalised financial advice. Nothing on this platform constitutes a recommendation to buy or sell any asset.",
    ],
  },
  {
    title: "Account Responsibilities",
    content: [
      "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.",
      "You must notify us immediately at security@apexcapital.com if you suspect any unauthorised access to your account.",
      "You may not use the platform for any unlawful purpose, including market manipulation, money laundering, or fraud.",
    ],
  },
  {
    title: "Fees & Payments",
    content: [
      "Commission-free trading applies to US stocks and ETFs. Fees for other asset classes are displayed clearly before you confirm any order.",
      "We reserve the right to introduce or change fees with 30 days' notice communicated via email and in-app notification.",
      "All fees are non-refundable once a trade has been executed.",
    ],
  },
  {
    title: "Termination",
    content: [
      "You may close your account at any time. Any open positions must be settled and funds withdrawn before closure is complete.",
      "We may suspend or terminate your account immediately if we reasonably believe you have violated these terms or applicable law.",
      "Upon termination, your right to use the platform ceases immediately. We will retain your data only as required by law.",
    ],
  },
  {
    title: "Limitation of Liability",
    content: [
      "To the fullest extent permitted by law, Apex Capital is not liable for any investment losses, indirect damages, or loss of data arising from your use of the platform.",
      "Our total liability to you for any claim shall not exceed the fees you paid to us in the 12 months preceding the claim.",
      "Nothing in these terms limits our liability for fraud, gross negligence, or any liability that cannot be excluded by law.",
    ],
  },
  {
    title: "Governing Law",
    content: [
      "These terms are governed by and construed in accordance with the laws of the State of Delaware, United States.",
      "Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Delaware.",
      "If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force.",
    ],
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="public" />

      <main className="px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-3xl">

          {/* Header */}
          <div className="mb-12">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Legal
            </p>
            <h1 className="mt-2 text-[36px] font-extrabold tracking-[-0.02em] text-[#111827] sm:text-[44px]">
              Terms of Service
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-[#6B7280]">
              These terms govern your use of the Apex Capital platform. Please
              read them carefully before investing. Last updated{" "}
              <span className="font-medium text-[#111827]">June 2025</span>.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, i) => (
              <div
                key={section.title}
                className="rounded-xl border border-[#E5E5E2] bg-white p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[12px] font-bold text-[#6B7280]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#111827]">
                      {section.title}
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {section.content.map((point, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D1D5DB]" />
                          <p className="text-[13px] leading-relaxed text-[#6B7280]">
                            {point}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-8 rounded-xl border border-[#E5E5E2] bg-[#F0F0ED] px-6 py-5">
            <p className="text-[13px] leading-relaxed text-[#6B7280]">
              Questions about these terms? Reach us at{" "}
              <a
                href="mailto:legal@apexcapital.com"
                className="font-medium text-[#111827] hover:underline"
              >
                legal@apexcapital.com
              </a>{" "}
              or visit our{" "}
              <Link href="/contact" className="font-medium text-[#111827] hover:underline">
                Contact page
              </Link>
              .
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}