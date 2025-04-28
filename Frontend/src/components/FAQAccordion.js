// src/components/FAQAccordion.js

import React, { useState } from "react";
import { FaChevronDown, FaQuestionCircle } from "react-icons/fa";

const FAQAccordion = ({ faqs = [] }) => {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold flex items-center mb-4">
        <FaQuestionCircle className="mr-2 text-blue-500" /> Frequently Asked Questions
      </h2>
      {faqs.map((faq, i) => (
        <div key={i} className="mb-2">
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full flex justify-between items-center bg-gray-100 px-4 py-2 rounded"
          >
            <span className="text-left text-sm font-medium text-gray-800">
              {faq.question}
            </span>
            <FaChevronDown
              className={`transition-transform duration-300 ${
                expanded === i ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
          {expanded === i && (
            <div className="p-4 bg-white border border-t-0 rounded-b text-sm text-gray-700">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FAQAccordion;
