import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Clock, X } from 'lucide-react'
import { homeworkAPI } from '../services/api'
import { toAssetUrl } from '../lib/assets'
import { logger } from '../lib/logger'

const Homework = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await homeworkAPI.getMySubmissions()
        setSubmissions(res.data)
      } catch (err) {
        logger.error('Error fetching submissions', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSubmissions()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      await homeworkAPI.upload(selectedFile, setUploadProgress)
      setMessage({ text: 'Homework submitted successfully!', type: 'success' })
      setSelectedFile(null)
      
      // Refresh submissions
      const res = await homeworkAPI.getMySubmissions()
      setSubmissions(res.data)
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Error uploading homework', type: 'error' })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>
        <h1 className="text-4xl font-bold text-text-light dark:text-text mb-2">Homework Submission</h1>
        <p className="text-text-muted-light dark:text-text-muted text-lg">Upload your homework assignments here</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-morphism rounded-[32px] p-8"
        >
          <h2 className="text-2xl font-bold text-text-light dark:text-text mb-6">Upload New Homework</h2>

          {message && (
            <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-success/20 text-success' : 'bg-red-500/20 text-red-500'}`}>
              {message.text}
            </div>
          )}

          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-black/20 dark:border-white/20 rounded-3xl py-12 cursor-pointer hover:border-accent transition-colors">
              <Upload className="w-16 h-16 text-text-muted-light dark:text-text-muted mb-4" />
              <span className="text-lg font-medium text-text-light dark:text-text">Choose a file</span>
              <span className="text-sm text-text-muted-light dark:text-text-muted mt-2">PDF, DOCX, or Images</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl">
                <div className="flex items-center space-x-4">
                  <FileText className="text-accent" size={32} />
                  <div>
                    <div className="font-medium text-text-light dark:text-text">{selectedFile.name}</div>
                    <div className="text-sm text-text-muted-light dark:text-text-muted">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-text-light dark:text-text">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="bg-accent h-full"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-accent text-primary py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all"
              >
                <Upload size={20} />
                <span>{uploading ? 'Uploading...' : 'Submit Homework'}</span>
              </button>
            </div> 
          )}
        </motion.div>

       {/* Submissions History */}
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  className="glass-morphism rounded-[32px] p-8"
>
  <h2 className="text-2xl font-bold text-text-light dark:text-text mb-6">
    Your Submissions
  </h2>

  {loading ? (
    <div className="text-center py-12 text-text-muted-light dark:text-text-muted">
      Loading submissions...
    </div>
  ) : submissions.length === 0 ? (
    <div className="text-center py-12 text-text-muted-light dark:text-text-muted">
      No submissions yet
    </div>
  ) : (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="text-accent" size={24} />
              <div>
                <div className="font-medium text-text-light dark:text-text">
                  {submission.fileUrl.split('/').pop()}
                </div>

                <div className="text-sm text-text-muted-light dark:text-text-muted flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{formatDate(submission.submittedAt)}</span>
                </div>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                submission.status === 'GRADED'
                  ? 'bg-success/20 text-success'
                  : submission.status === 'REVIEWED'
                  ? 'bg-blue-400/20 text-blue-400'
                  : 'bg-yellow-400/20 text-yellow-400'
              }`}
            >
              {submission.status}
            </span>
          </div>

          {submission.grade && (
            <div className="pt-2 border-t border-black/10 dark:border-white/10">
              <span className="text-sm text-text-muted-light dark:text-text-muted">
                Grade:
              </span>{' '}
              <span className="font-bold text-accent">
                {submission.grade}
              </span>
            </div>
          )}

          {submission.feedback && (
            <div className="pt-2">
              <div className="text-sm text-text-muted-light dark:text-text-muted mb-1">
                Feedback:
              </div>

              <div className="text-text-light dark:text-text">
                {submission.feedback}
              </div>
            </div>
          )}

          {submission.correctionUrl && (
            <div className="pt-3">
              <button
                onClick={() => {
                  const url = toAssetUrl(submission.correctionUrl)

                  const link = document.createElement('a');
                  link.href = url;
                  link.download = '';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link); 
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all"
              >
                Download Correction PDF
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</motion.div>
      </div>
    </div>
  )
}

export default Homework
