export function getServerSideProps({ params, query }) {
  const review = typeof query.review === 'string' ? `?review=${encodeURIComponent(query.review)}` : '';
  return { redirect: { destination: `/employer/jobs/${encodeURIComponent(params.id)}/applications${review}`, permanent: false } };
}

export default function EmployerJob() { return null; }
