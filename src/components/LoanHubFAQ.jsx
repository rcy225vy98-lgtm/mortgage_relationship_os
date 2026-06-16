import { useState } from 'react'
import { defaultLoanHubFaqs } from '../utils/loanHub'

export default function LoanHubFAQ({ faqs = defaultLoanHubFaqs }) {
  const [openQuestion, setOpenQuestion] = useState(faqs[0]?.question || '')

  return (
    <div className="loan-hub-faq-list">
      {faqs.map((faq) => {
        const isOpen = openQuestion === faq.question

        return (
          <div className={isOpen ? 'loan-hub-faq-item open' : 'loan-hub-faq-item'} key={faq.question}>
            <button type="button" onClick={() => setOpenQuestion(isOpen ? '' : faq.question)}>
              <span>{faq.question}</span>
              <b>{isOpen ? '-' : '+'}</b>
            </button>
            {isOpen && <p>{faq.answer}</p>}
          </div>
        )
      })}
    </div>
  )
}
