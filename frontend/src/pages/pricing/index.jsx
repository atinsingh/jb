import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Navbar } from '../../components/navbar';
import { Footer } from '../../components/footer';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/config/api';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/billing/plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (plan.type === 'FREE') {
      router.push('/signup');
      return;
    }

    if (!user || !token) {
      router.push(`/signup?plan=${plan.type}&cycle=${billingCycle}`);
      return;
    }

    try {
      setProcessingPlan(plan._id);
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: plan._id,
          billingCycle,
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setProcessingPlan(null);
    }
  };

  // Default plans for fallback
  const defaultPlans = [
    {
      _id: 'free',
      name: 'Free',
      type: 'FREE',
      description: 'Start Your Job Search',
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        'AI-Powered Resume Builder',
        'Smart Resume Score Analyzer',
        'Basic Cover Letter Generator',
        '10 Auto Applications/month',
        'Job Search Tools',
        'Email Support'
      ],
      sortOrder: 0,
    },
    {
      _id: 'pro',
      name: 'Pro',
      type: 'PRO',
      description: 'Triple Your Interview Chances!',
      priceMonthly: 29,
      priceYearly: 264,
      features: [
        'Everything in Free',
        '250 Auto Applications/month',
        'AI-Optimized Resumes per Job',
        'Tailored Cover Letters',
        'Priority Job Matching',
        'Interview Preparation Tools',
        'Application Analytics',
        'Priority Email Support'
      ],
      sortOrder: 1,
    },
    {
      _id: 'scale',
      name: 'Scale',
      type: 'ELITE',
      description: 'Dominate Your Job Search!',
      priceMonthly: 59,
      priceYearly: 528,
      features: [
        'Everything in Pro',
        '1000 Auto Applications/month',
        'Advanced AI Optimization',
        'Interview Buddy (Real-time)',
        'Resume Translator',
        'Career Coaching Sessions',
        'Dedicated Account Manager',
        '24/7 Priority Support'
      ],
      sortOrder: 2,
    },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  const getPlanPrice = (plan) => {
    if (billingCycle === 'annual') {
      return plan.priceYearly / 12;
    }
    return plan.priceMonthly;
  };

  const currentPlanType = user?.currentPlanType || 'FREE';

  return (
    <div className="bg-white">
      <Head>
        <title>Pricing - Jobocate | AI-Powered Job Search Plans</title>
        <meta name="description" content="Choose the perfect plan for your job search. From free tools to enterprise solutions." />
      </Head>

      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-orange-50 via-white to-purple-50">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Pricing</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Land Your Dream Job Faster - AI Powered Tools That Get You More Interviews, Guaranteed.
          </p>

          {user ? (
            <>
              {/* Billing Toggle */}
              <div className="inline-flex items-center bg-gray-100 rounded-full p-1 mb-16">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-600'
                    }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 relative ${billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-600'
                    }`}
                >
                  Annual
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Save 25%
                  </span>
                </button>
              </div>

              {/* Pricing Cards */}
              <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto pt-12">
                {displayPlans.filter(p => p.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder).map((plan) => {
                  const isPro = plan.type === 'PRO';
                  const isCurrentPlan = plan.type === currentPlanType;
                  const price = getPlanPrice(plan);

                  return (
                    <div
                      key={plan._id}
                      className={`relative ${isPro ? 'transform md:scale-110 z-10' : ''}`}
                    >
                      {/* Popular Badge */}
                      {isPro && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg z-20">
                          ⚡ MOST POPULAR
                        </div>
                      )}

                      {isPro && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl blur-lg opacity-50"></div>
                      )}

                      <div className={`relative bg-white p-8 rounded-3xl ${isPro ? '' : 'border-2 border-gray-200 hover:border-orange-300 transition-all duration-300 hover:shadow-2xl'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-3xl font-bold text-gray-900">{plan.name}</h3>
                          {plan.type === 'ELITE' && (
                            <span className="bg-purple-100 text-purple-700 text-sm font-bold px-3 py-1 rounded-full">
                              50% OFF
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-6">{plan.description}</p>

                        <div className="mb-6">
                          <span className="text-6xl font-bold text-gray-900">
                            ${Math.round(price)}
                          </span>
                          <span className="text-gray-600 text-xl">/month</span>
                          {billingCycle === 'monthly' && plan.priceMonthly > 0 && (
                            <div className="mt-2">
                              <span className="ml-2 text-sm font-semibold text-green-600">
                                {plan.type === 'PRO' ? 'Save $6/month' : 'Save $36/month'}
                              </span>
                            </div>
                          )}
                        </div>

                        {plan.type !== 'FREE' && (
                          <div className={`${isPro ? 'bg-orange-50 border-2 border-orange-200' : 'bg-purple-50 border-2 border-purple-200'} rounded-xl p-4 mb-8`}>
                            <p className={`font-bold ${isPro ? 'text-orange-700' : 'text-purple-700'} flex items-center gap-2`}>
                              <span className="text-2xl">{isPro ? '⚡' : '🚀'}</span>
                              <span>{isPro ? '250' : '1000'} auto applies/month</span>
                            </p>
                            <p className={`text-sm ${isPro ? 'text-orange-600' : 'text-purple-600'} mt-1`}>
                              Only ${isPro ? '0.12' : '0.06'} per application!
                            </p>
                          </div>
                        )}

                        <ul className="space-y-4 mb-8 text-left">
                          {plan.features?.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <svg className={`w-6 h-6 ${isPro ? 'text-orange-500' : plan.type === 'ELITE' ? 'text-purple-500' : 'text-green-500'} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-gray-700 font-medium">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {isCurrentPlan ? (
                          <button
                            disabled
                            className="w-full py-4 bg-gray-100 text-gray-500 font-bold text-lg rounded-xl cursor-not-allowed"
                          >
                            Current Plan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSubscribe(plan)}
                            disabled={processingPlan === plan._id}
                            className={`w-full py-4 font-bold text-lg rounded-xl transition-all duration-300 ${isPro
                              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xl hover:shadow-2xl hover:scale-105'
                              : plan.type === 'ELITE'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl'
                                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                              }`}
                          >
                            {processingPlan === plan._id ? (
                              <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </span>
                            ) : plan.type === 'FREE' ? (
                              'Get Started Free'
                            ) : (
                              `Get Started with ${plan.name}`
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Money-back Guarantee */}
              <p className="text-center text-gray-600 mt-12 text-lg">
                ✓ 7-day money-back guarantee · ✓ No credit card required for Free plan · ✓ Cancel anytime
              </p>
            </>
          ) : (
            <div className="max-w-xl mx-auto text-center py-12 bg-white rounded-3xl shadow-xl mt-12">
              <h3 className="text-3xl font-bold mb-4 text-gray-900">Sign up to see plans</h3>
              <p className="text-gray-600 mb-8 px-8">Create a free account to view our pricing plans and start your job search journey today.</p>
              <Link href="/signup">
                <button className="px-10 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xl rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  Create Free Account
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Comparison Table */}
      {user && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
              Compare Plans & Features
            </h2>

            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                      <th className="py-6 px-6 text-left font-bold text-lg">Features</th>
                      <th className="py-6 px-6 text-center font-bold text-lg">Free</th>
                      <th className="py-6 px-6 text-center font-bold text-lg">Pro</th>
                      <th className="py-6 px-6 text-center font-bold text-lg">Scale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { feature: 'Auto Applications per Month', free: '10', pro: '250', scale: '1000' },
                      { feature: 'AI Resume Builder', free: '✓', pro: '✓', scale: '✓' },
                      { feature: 'AI Cover Letters', free: 'Basic', pro: 'Advanced', scale: 'Premium' },
                      { feature: 'Smart Job Matching', free: '✓', pro: '✓', scale: '✓' },
                      { feature: 'Resume Score Analyzer', free: '✓', pro: '✓', scale: '✓' },
                      { feature: 'Interview Preparation', free: '-', pro: '✓', scale: '✓' },
                      { feature: 'Interview Buddy (Real-time)', free: '-', pro: '-', scale: '✓' },
                      { feature: 'Resume Translator', free: '-', pro: '-', scale: '✓' },
                      { feature: 'Career Coaching', free: '-', pro: '-', scale: '✓' },
                      { feature: 'Support', free: 'Email', pro: 'Priority', scale: '24/7' }
                    ].map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-5 px-6 font-medium text-gray-900">{row.feature}</td>
                        <td className="py-5 px-6 text-center text-gray-700">{row.free}</td>
                        <td className="py-5 px-6 text-center text-orange-600 font-semibold">{row.pro}</td>
                        <td className="py-5 px-6 text-center text-purple-600 font-semibold">{row.scale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-bold text-center text-gray-900 mb-16">
            Frequently Asked <span className="text-orange-600">Questions</span>
          </h2>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                q: 'How does Jobocate work?',
                a: 'Jobocate uses advanced AI to analyze your resume, match you with relevant jobs, customize your application materials for each role, and automatically apply on your behalf. You just upload your resume, set preferences, and let AI do the heavy lifting.'
              },
              {
                q: 'How effective is Jobocate in getting interviews?',
                a: 'Our users land interviews 17x faster than traditional job search methods. With AI-optimized resumes and cover letters tailored to each job, you significantly increase your chances of getting noticed by recruiters.'
              },
              {
                q: 'Can I control which jobs Jobocate applies to?',
                a: 'Absolutely! You set detailed preferences including job titles, industries, salary range, location, and required skills. Our AI only applies to jobs that match your criteria. You can also review and approve applications before they\'re sent (on Pro and Scale plans).'
              },
              {
                q: 'Will recruiters know I\'m using Jobocate?',
                a: 'No. Each resume and cover letter is uniquely customized to sound natural and authentic. Our AI writes in your voice, highlighting your real experience and skills. There\'s no indication that AI was used.'
              },
              {
                q: 'How soon can I expect to see results?',
                a: 'Most users start receiving interview invitations within 3-7 days of activating auto-apply. The key is volume and quality - our AI sends dozens of highly-targeted applications daily, dramatically increasing your odds.'
              },
              {
                q: 'What happens if I want to stop auto-applying?',
                a: 'You can pause or stop auto-apply anytime from your dashboard with a single click. All settings are under your full control.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative container mx-auto px-4 text-center z-10">
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6">
            Try Jobocate Free Today
          </h2>
          <p className="text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
            Ready to see results? Start applying in minutes and watch the interviews roll in.
          </p>
          <Link href="/signup">
            <button className="px-12 py-5 bg-white text-orange-600 font-bold text-xl rounded-xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300">
              Get Started - It's Free →
            </button>
          </Link>
          <p className="text-white/80 mt-6 text-lg">No credit card required • 7-day money-back guarantee</p>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
