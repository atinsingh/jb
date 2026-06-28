export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Here you would typically:
    // 1. Save the email to your database
    // 2. Add them to your email marketing service
    // 3. Send a welcome email
    
    // For now, we'll just log it
    console.log('New subscription:', email);

    return res.status(200).json({ 
      success: true,
      message: 'Thank you for subscribing!'
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process subscription. Please try again.'
    });
  }
}
