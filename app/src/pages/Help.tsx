import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, MessageCircle, Mail, Book, Video } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    question: 'How do I register for a hackathon?',
    answer: 'Browse the Events page, find a hackathon you\'re interested in, and click the "Register Now" button. You\'ll need to be logged in to complete registration.',
    category: 'Getting Started',
  },
  {
    question: 'Can I participate as a solo developer?',
    answer: 'Yes! While we encourage team participation, solo developers are welcome. You can also use our team matching feature to find teammates.',
    category: 'Getting Started',
  },
  {
    question: 'What is the typical team size?',
    answer: 'Most hackathons allow teams of 2-4 members. Check the specific event rules for team size requirements.',
    category: 'Teams',
  },
  {
    question: 'How do I find teammates?',
    answer: 'Use the "Find Teammates" feature in your dashboard. You can filter by skills, timezone, and interests to find the perfect match.',
    category: 'Teams',
  },
  {
    question: 'What should I submit?',
    answer: 'Typically, you need to submit your source code (GitHub repository), a demo video, and a presentation. Check the event rules for specific requirements.',
    category: 'Submissions',
  },
  {
    question: 'Can I use existing code?',
    answer: 'Most hackathons require that the majority of your code be written during the event. However, you can use open-source libraries and APIs.',
    category: 'Submissions',
  },
  {
    question: 'How are projects judged?',
    answer: 'Projects are typically judged on innovation, execution, presentation, and impact. Each event may have specific criteria outlined in the rules.',
    category: 'Judging',
  },
  {
    question: 'When will results be announced?',
    answer: 'Results are usually announced within 1-2 weeks after the submission deadline. You\'ll be notified via email and in-app notifications.',
    category: 'Judging',
  },
  {
    question: 'What are the prizes?',
    answer: 'Prizes vary by event and can include cash awards, cloud credits, mentorship opportunities, and more. Check the event details for specific prizes.',
    category: 'Prizes',
  },
  {
    question: 'How do I contact support?',
    answer: 'You can reach our support team via email at support@hackverse.com or use the chat feature in the bottom right corner.',
    category: 'Support',
  },
];

const categories = ['All', 'Getting Started', 'Teams', 'Submissions', 'Judging', 'Prizes', 'Support'];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredFAQs = faqs.filter(
    (faq) =>
      (selectedCategory === 'All' || faq.category === selectedCategory) &&
      (faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-mono-label text-cyber-cyan mb-4">SUPPORT</p>
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
            How Can We Help?
          </h1>
          <p className="text-lg text-cyber-gray max-w-2xl mx-auto">
            Find answers to common questions or contact our support team
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for answers..."
            className="cyber-input pl-12 w-full"
          />
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <a
            href="#"
            className="cyber-card p-6 text-center hover:border-cyber-cyan transition-colors group"
          >
            <div className="w-12 h-12 bg-cyber-cyan/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-cyber-cyan/20 transition-colors">
              <Book className="w-6 h-6 text-cyber-cyan" />
            </div>
            <h3 className="text-white font-semibold mb-2">Documentation</h3>
            <p className="text-cyber-gray text-sm">Read our comprehensive guides</p>
          </a>
          <a
            href="#"
            className="cyber-card p-6 text-center hover:border-cyber-cyan transition-colors group"
          >
            <div className="w-12 h-12 bg-cyber-cyan/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-cyber-cyan/20 transition-colors">
              <Video className="w-6 h-6 text-cyber-cyan" />
            </div>
            <h3 className="text-white font-semibold mb-2">Video Tutorials</h3>
            <p className="text-cyber-gray text-sm">Learn with step-by-step videos</p>
          </a>
          <a
            href="#"
            className="cyber-card p-6 text-center hover:border-cyber-cyan transition-colors group"
          >
            <div className="w-12 h-12 bg-cyber-cyan/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-cyber-cyan/20 transition-colors">
              <MessageCircle className="w-6 h-6 text-cyber-cyan" />
            </div>
            <h3 className="text-white font-semibold mb-2">Community</h3>
            <p className="text-cyber-gray text-sm">Join our Discord community</p>
          </a>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                selectedCategory === category
                  ? 'border-cyber-cyan bg-cyber-cyan/20 text-cyber-cyan'
                  : 'border-cyber-cyan/30 text-cyber-gray hover:border-cyber-cyan/50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          <h2 className="text-2xl font-heading font-semibold text-white mb-6">
            Frequently Asked Questions
          </h2>
          {filteredFAQs.map((faq, index) => (
            <div
              key={index}
              className="cyber-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === faq.question ? null : faq.question)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-white font-medium">{faq.question}</span>
                {expandedFAQ === faq.question ? (
                  <ChevronUp className="w-5 h-5 text-cyber-cyan" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-cyber-gray" />
                )}
              </button>
              {expandedFAQ === faq.question && (
                <div className="px-4 pb-4">
                  <p className="text-cyber-gray">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredFAQs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-cyber-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-cyber-cyan" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-white mb-2">
              No results found
            </h3>
            <p className="text-cyber-gray">
              Try adjusting your search or browse all categories
            </p>
          </div>
        )}

        {/* Contact */}
        <div className="cyber-card p-8 mt-12 text-center">
          <h2 className="text-2xl font-heading font-semibold text-white mb-4">
            Still Need Help?
          </h2>
          <p className="text-cyber-gray mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:support@hackverse.com"
              className="cyber-button flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Email Support</span>
            </a>
            <a
              href="#"
              className="cyber-button-primary flex items-center space-x-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Live Chat</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
