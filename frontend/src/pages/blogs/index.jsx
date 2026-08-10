import React from 'react'
import Layout from '@/components/layout/PublicLayout'
import BlogHeader from '@/components/header/blogHeader'
import CallToAction from '@/components/common/CallToAction'
import BlogSection from '@/components/Blog/BlogSection'
const index = () => {
  return (
   <Layout>
    <BlogHeader/>
    <BlogSection/>
    <CallToAction/>
   </Layout>
  )
}

export default index