import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout';
import SEO from '@/components/seo/SEO';
import { uploadResume } from '@/services/api';
import { toast } from 'react-toastify';

export default function ResumeUpload() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please upload a PDF or DOCX file');
      return;
    }

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadResume(file);
      setParsedData(response.data);
      toast.success('Resume uploaded and parsed successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <SEO
        title="Upload Resume - AI-Powered Profile Creation | JobOcate"
        description="Upload your resume and let our AI automatically create and update your profile"
      />
      <Layout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Upload Your Resume
              </h1>
              <p className="text-xl text-gray-600">
                Let our AI parse your resume and automatically create your profile
              </p>
            </div>

            {!parsedData ? (
              <div className="bg-white rounded-lg shadow-lg p-8">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragActive
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-orange-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="space-y-4">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <div className="text-gray-600">
                      {file ? (
                        <p className="text-lg font-medium text-gray-900">
                          {file.name}
                        </p>
                      ) : (
                        <>
                          <p className="text-lg">
                            Drag and drop your resume here, or{' '}
                            <label className="text-orange-600 hover:text-orange-700 cursor-pointer font-medium">
                              browse
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.docx"
                                onChange={handleFileChange}
                              />
                            </label>
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            Supports PDF and DOCX (Max 5MB)
                          </p>
                        </>
                      )}
                    </div>

                    {file && (
                      <button
                        onClick={() => setFile(null)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Button */}
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="px-8 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? 'Uploading...' : 'Upload & Parse Resume'}
                  </button>
                </div>

                {/* Info */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Your resume will be analyzed by our AI</li>
                    <li>• We'll extract your skills, experience, and education</li>
                    <li>• Your profile will be automatically created/updated</li>
                    <li>• You'll get job recommendations based on your profile</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8">
                {/* Success Message */}
                <div className="text-center mb-8">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Resume Parsed Successfully!
                  </h2>
                  <p className="text-gray-600">
                    Your profile has been updated with the extracted information
                  </p>
                </div>

                {/* Parsed Data Preview */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                    <p className="text-gray-700">Name: {parsedData.name}</p>
                    <p className="text-gray-700">Email: {parsedData.email}</p>
                    {parsedData.phone && <p className="text-gray-700">Phone: {parsedData.phone}</p>}
                  </div>

                  {parsedData.skills && parsedData.skills.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {parsedData.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedData.summary && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                      <p className="text-gray-700">{parsedData.summary}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex gap-4 justify-center">
                  <button
                    onClick={() => router.push('/candidate/recommendations')}
                    className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    View Job Recommendations
                  </button>
                  <button
                    onClick={() => router.push('/candidate/profile')}
                    className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
