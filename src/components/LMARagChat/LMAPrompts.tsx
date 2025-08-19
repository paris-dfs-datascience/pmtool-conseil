import React, { useState } from 'react';
import { FileText, Briefcase, Target, Users, DollarSign, Lightbulb, Search } from 'lucide-react';

interface ConsultingPromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'General' | 'Technical' | 'Strategy' | 'Management';
  icon: React.ReactNode;
}

interface ConsultingPromptLibraryProps {
  onSelectPrompt?: (prompt: string) => void;
  selectedPromptId?: string | null;
}

const ConsultingPromptLibrary: React.FC<ConsultingPromptLibraryProps> = ({ onSelectPrompt, selectedPromptId }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const [promptTemplates] = useState<ConsultingPromptTemplate[]>([
    {
      id: '1',
      title: 'General Consulting Pitch',
      description: 'Standard proposal response template focusing on experience and capabilities',
      prompt: `First read the information I provided to understand what the client is looking for. Then see if there is any immediate instructions. Then draft a response.

Never write more than 2400 characters. 
Always write in the first person.
These are the instructions from the portal:

Experts who personalize their pitch often stand out to clients. Use this section to introduce yourself and elaborate on your background and relevant experience. Include details on why the past projects you've chosen demonstrate how you're well-suited to do the work. Feel free to also include any additional information about project logistics that may be helpful.`,
      category: 'General',
      icon: <Briefcase size={18} />
    },
    {
      id: '2',
      title: 'Technical Implementation Pitch',
      description: 'Response template for technical implementation projects',
      prompt: `Review the technical requirements carefully. Draft a response that:

1. Demonstrates deep technical expertise
2. Highlights relevant implementation experience
3. Outlines development methodology
4. Addresses technical challenges proactively
5. Provides clear timeline expectations

Keep under 2400 characters.
Write in first person.
Focus on concrete examples of similar technical projects.`,
      category: 'Technical',
      icon: <FileText size={18} />
    },
    {
      id: '3',
      title: 'Strategic Advisory Pitch',
      description: 'Template for strategic consulting proposals',
      prompt: `Analyze the strategic challenge presented. Structure response to:

1. Show understanding of client's industry context
2. Highlight relevant strategic advisory experience
3. Outline consulting methodology
4. Demonstrate similar organization experience
5. Present unique strategic perspective

Maximum 2400 characters.
Write in first person.
Emphasize measurable results and impact.`,
      category: 'Strategy',
      icon: <Target size={18} />
    },
    {
      id: '4',
      title: 'Change Management Pitch',
      description: 'Template for organizational transformation projects',
      prompt: `Review the organizational change requirements. Draft response that:

1. Shows change management expertise
2. Highlights successful transformations led
3. Outlines change methodology
4. Addresses stakeholder management
5. Demonstrates cultural sensitivity

Keep under 2400 characters.
Write in first person.
Focus on specific transformation examples.`,
      category: 'Management',
      icon: <Users size={18} />
    }
  ]);

  const categories = ['All', 'General', 'Technical', 'Strategy', 'Management'];
  
  const filteredPrompts = selectedCategory === 'All' 
    ? promptTemplates 
    : promptTemplates.filter(prompt => prompt.category === selectedCategory);

  const handlePromptSelect = (prompt: ConsultingPromptTemplate) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt.prompt);
    }
  };

  return (
    <div className="bg-gray-50 h-screen max-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Consulting Pitch Templates</h3>
          <p className="text-sm text-gray-500 mt-1">
            {filteredPrompts.length} proposal templates available
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {filteredPrompts.map((template) => (
          <div
            key={template.id}
            onClick={() => handlePromptSelect(template)}
            className={`bg-white border-2 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all group ${
              selectedPromptId === template.id 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Template content structure same as LMAPrompts.tsx */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <div className={`mr-3 transition-colors ${
                  selectedPromptId === template.id 
                    ? 'text-blue-700' 
                    : 'text-blue-600 group-hover:text-blue-700'
                }`}>
                  {template.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{template.title}</h4>
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium mt-1 bg-blue-100 text-blue-700">
                    {template.category}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {template.description}
            </p>
            
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-700 line-clamp-3">
                {template.prompt}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsultingPromptLibrary;