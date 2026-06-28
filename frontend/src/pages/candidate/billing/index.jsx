import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import CandidateLayout from '@/components/layout/CandidateLayout';
import { API_URL } from '@/config/api';

const BillingPage = () => {
  const { user, token } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchBillingData();
  }, [user]);

  useEffect(() => {
    // Check for success/canceled query params
    const { success, canceled } = router.query;
    if (success) {
      fetchBillingData();
      router.replace('/candidate/billing', undefined, { shallow: true });
    }
    if (canceled) {
      router.replace('/candidate/billing', undefined, { shallow: true });
    }
  }, [router.query]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        fetch(`${API_URL}/api/billing/plans`),
        token ? fetch(`${API_URL}/api/billing/subscription`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }) : Promise.resolve({ ok: false }),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setProcessingPlan(planId);
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId,
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

  const handleManageBilling = async () => {
    try {
      const res = await fetch(`${API_URL}/api/billing/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Portal error:', error);
    }
  };

  const handleCancelSubscription = async (cancelAtPeriodEnd = true) => {
    try {
      const res = await fetch(`${API_URL}/api/billing/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });

      if (res.ok) {
        setShowCancelModal(false);
        fetchBillingData();
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch(`${API_URL}/api/billing/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchBillingData();
      }
    } catch (error) {
      console.error('Reactivate error:', error);
    }
  };

  const currentPlanType = subscription?.planId?.type || user?.currentPlanType || 'FREE';

  const getPlanPrice = (plan) => {
    if (billingCycle === 'yearly') {
      return plan.priceYearly / 12;
    }
    return plan.priceMonthly;
  };

  if (loading) {
    return (
      <CandidateLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <Head>
        <title>Billing & Subscription - Jobocate</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing preferences</p>
        </div>

        {/* Current Subscription Card */}
        {subscription && subscription.status !== 'canceled' && (
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white/80 text-sm mb-1">Current Plan</p>
                <h2 className="text-2xl font-bold">{subscription.planId?.name || currentPlanType} Plan</h2>
                <p className="text-white/80 mt-1">
                  {subscription.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} billing
                </p>
                {subscription.cancelAtPeriodEnd && (
                  <p className="text-yellow-300 mt-2 font-medium">
                    ⚠️ Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                {subscription.cancelAtPeriodEnd ? (
                  <button
                    onClick={handleReactivate}
                    className="px-4 py-2 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-all"
                  >
                    Reactivate
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleManageBilling}
                      className="px-4 py-2 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-all"
                    >
                      Manage Billing
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            {subscription.currentPeriodEnd && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-white/80 text-sm">
                  Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((plan) => {
            const isCurrentPlan = plan.type === currentPlanType;
            const price = getPlanPrice(plan);

            return (
              <div
                key={plan._id}
                className={`relative rounded-2xl p-6 transition-all ${
                  plan.type === 'PRO'
                    ? 'bg-white border-2 border-orange-500 shadow-xl scale-105'
                    : 'bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}
              >
                {plan.type === 'PRO' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                    MOST POPULAR
                  </div>
                )}

                <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">${Math.round(price)}</span>
                  <span className="text-gray-600">/month</span>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-green-600 mt-1">
                      Billed ${plan.priceYearly}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3 bg-gray-100 text-gray-500 font-semibold rounded-lg cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : plan.type === 'FREE' ? (
                  <button
                    disabled
                    className="w-full py-3 bg-gray-100 text-gray-500 font-semibold rounded-lg cursor-not-allowed"
                  >
                    Free Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan._id)}
                    disabled={processingPlan === plan._id}
                    className={`w-full py-3 font-semibold rounded-lg transition-all ${
                      plan.type === 'PRO'
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
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
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ / Help */}
        <div className="mt-12 bg-gray-50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Billing FAQ</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">How do I cancel my subscription?</h3>
              <p className="text-gray-600 text-sm mt-1">
                Click "Cancel" above. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Can I switch plans?</h3>
              <p className="text-gray-600 text-sm mt-1">
                Yes! Click "Manage Billing" to upgrade or downgrade your plan through our billing portal.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm mt-1">
                We accept all major credit cards, debit cards, and Apple Pay / Google Pay.
              </p>
            </div>
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Cancel Subscription?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel? You'll still have access until the end of your billing period.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={() => handleCancelSubscription(true)}
                  className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                >
                  Cancel at Period End
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CandidateLayout>
  );
};

export default BillingPage;

