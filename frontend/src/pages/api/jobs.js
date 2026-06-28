import { jobs } from '@/data/jobs';

export default function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const newJob = {
        id: jobs.length + 1, // In a real app, use a proper ID generation
        ...req.body,
        postedDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        companyLogo: 'https://img.icons8.com/color/48/000000/company.png' // Default logo
      };

      // In a real app, you would save this to a database
      // For now, we'll just log it
      console.log('New job posted:', newJob);
      
      // Add to our in-memory array (will be reset on server restart)
      jobs.unshift(newJob);

      res.status(201).json({ success: true, job: newJob });
    } catch (error) {
      console.error('Error posting job:', error);
      res.status(500).json({ success: false, error: 'Failed to post job' });
    }
  } else if (req.method === 'GET') {
    // For demo purposes, return all jobs
    res.status(200).json(jobs);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
