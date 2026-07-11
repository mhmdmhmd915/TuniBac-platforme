import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search } from 'lucide-react'
import { usePlatformSettings } from '../context/PlatformSettingsContext'

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const { settings } = usePlatformSettings()
  const platformName = settings.platformName || 'TuniBac'

  const faqs = [
    {
      id: 1,
      question: "How do I access the PDF course materials?",
      answer: "Once you're logged in, navigate to any course page. You'll find a 'Course Material' section with an embedded PDF viewer. You can read it directly on the platform or download it for offline use."
    },
    {
      id: 2,
      question: "Are the exercises updated for the latest Tunisian curriculum?",
      answer: "Yes, our academic team regularly reviews and updates all Mathematics, Physics, and Science exercises to ensure they perfectly align with the current Tunisian educational standards."
    },
    {
      id: 3,
      question: "Can I track my progress across different devices?",
      answer: "Absolutely! Your progress is synced to your account. You can start a course on your laptop and continue from where you left off on your tablet or phone."
    },
    {
      id: 4,
      question: "How does the homework upload system work?",
      answer: "In your student dashboard, you'll find a 'Homework' section. You can drag and drop your completed assignments (PDF, DOCX, or Images), and our system will notify you once they've been reviewed."
    }
  ]

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.answer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold text-text-light dark:text-text">Frequently Asked Questions</h1>
        <p className="text-text-muted-light dark:text-text-muted text-lg">Everything you need to know about {platformName}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted" size={24} />
        <input
          type="text"
          placeholder="Search for answers..."
          className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-3xl py-6 pl-16 pr-6 text-lg text-text-light dark:text-text focus:border-accent outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredFaqs.map((faq) => (
          <div key={faq.id} className="glass-morphism rounded-3xl overflow-hidden">
            <button
              onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
              className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-xl font-bold text-text-light dark:text-text">{faq.question}</span>
              <motion.div
                animate={{ rotate: openId === faq.id ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={24} className="text-accent" />
              </motion.div>
            </button>
            <AnimatePresence>
              {openId === faq.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-8 pb-8 text-text-muted-light dark:text-text-muted text-lg leading-relaxed border-t border-black/10 dark:border-white/5 pt-4">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FAQ
