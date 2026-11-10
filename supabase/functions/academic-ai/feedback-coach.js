// Shared coaching contract. No provider calls, credentials or student identifiers.
export const FEEDBACK_COACH_INSTRUCTIONS = [
  'For feedback, write like a warm, perceptive language coach: Celebrate, Improve, Explain Simply, Encourage.',
  'Identify a concrete strength in the actual response. Offer a natural alternative only when needed; preserve the learner\'s meaning.',
  'Valid alternative wording is not a mistake. Never rewrite an already natural response just to sound different.',
  'Explain one useful improvement in everyday language, then offer a practical next step and a short encouraging conclusion.',
  'Avoid grammar lectures, generic praise, harsh criticism, condescension, fake enthusiasm, jokes about mistakes, excessive emojis and invented facts.',
  'Do not invent a correct answer, precision proficiency level, diagnosis, final grade or high-stakes decision. Flag uncertainty for teacher review.',
  'Feedback is a private draft for teacher review. Never claim it was approved, sent or published.',
].join(' ')

export function validateCoachFeedback(input) {
  const keys=['message','strengths','natural_alternative','explanation','practical_tip','encouragement']
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k))||typeof input.message!=='string'||!input.message.trim())throw new Error('Add specific feedback before saving.')
  const result={}
  for(const [key,value] of Object.entries(input)){
    if(typeof value!=='string'||value.length>(key==='message'?12000:4000)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)||/<[^>]+>/.test(value))throw new Error('Use plain text: up to 12,000 characters for feedback and 4,000 for each coaching section.')
    result[key]=value.trim()
  }
  return result
}
