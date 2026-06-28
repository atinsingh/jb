import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiProviderService {
  private provider: string;
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai';
    this.initializeClients();
  }

  private initializeClients() {
    try {
      if (this.provider === 'openai' || process.env.OPENAI_API_KEY || process.env.EMERGENT_LLM_KEY) {
        const apiKey = process.env.OPENAI_API_KEY || process.env.EMERGENT_LLM_KEY;
        if (apiKey) {
          this.openai = new OpenAI({ apiKey });
          console.log('✅ OpenAI client initialized');
        } else {
          console.warn('⚠️ OpenAI API key not found. AI features will not work.');
        }
      }

      if (this.provider === 'anthropic' || process.env.ANTHROPIC_API_KEY) {
        if (process.env.ANTHROPIC_API_KEY) {
          this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });
          console.log('✅ Anthropic client initialized');
        } else {
          console.warn('⚠️ Anthropic API key not found.');
        }
      }
    } catch (error: any) {
      console.error('Error initializing AI clients:', error.message);
    }
  }

  async generateChatResponse(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    try {
      let response: any;

      if (this.provider === 'openai' && this.openai) {
        response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages.map((message) => ({
            role: message.role as 'system' | 'user' | 'assistant',
            content: message.content,
          })),
          temperature: 0.7,
          max_tokens: 800,
        });

        return response.choices[0].message.content || '';
      } else if (this.provider === 'anthropic' && this.anthropic) {
        const systemMessage = messages.find((message) => message.role === 'system');
        const conversationMessages: Array<{
          role: 'user' | 'assistant';
          content: string;
        }> = messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content,
          }));

        response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 800,
          system: systemMessage?.content,
          messages: conversationMessages,
        });

        return response.content[0].type === 'text' ? response.content[0].text : '';
      }

      throw new Error(`Unsupported AI provider: ${this.provider}`);
    } catch (error: any) {
      console.error('AI chat response error:', error.message);
      throw new Error('Failed to generate chat response');
    }
  }

  async parseResume(resumeText: string): Promise<any> {
    const prompt = `Extract structured information from this resume. Return ONLY valid JSON with these fields:
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "summary": "professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "time period",
      "description": "job description"
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "school name",
      "year": "graduation year"
    }
  ]
}

Resume text:
${resumeText}`;

    try {
      let response: any;

      if (this.provider === 'openai' && this.openai) {
        response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a resume parser. Extract structured data and return only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        });

        const content = response.choices[0].message.content;
        return this.parseJSONResponse(content);
      } else if (this.provider === 'anthropic' && this.anthropic) {
        response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].text;
        return this.parseJSONResponse(content);
      }

      throw new Error(`Unsupported AI provider: ${this.provider}`);
    } catch (error: any) {
      console.error('AI parsing error:', error.message);
      throw new Error('Failed to parse resume with AI');
    }
  }

  async calculateJobMatch(
    candidateSkills: string[],
    jobRequirements: string,
    jobDescription: string,
  ): Promise<any> {
    const prompt = `Analyze the match between this candidate and job. Return ONLY valid JSON:
{
  "matchScore": 85,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "reasoning": "detailed explanation of the match"
}

Candidate Skills: ${candidateSkills.join(', ')}
Job Requirements: ${jobRequirements}
Job Description: ${jobDescription}

Provide a match score (0-100) and detailed analysis.`;

    try {
      let response: any;

      if (this.provider === 'openai' && this.openai) {
        response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a job matching expert. Analyze matches and return only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
        });

        const content = response.choices[0].message.content;
        return this.parseJSONResponse(content);
      } else if (this.provider === 'anthropic' && this.anthropic) {
        response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].text;
        return this.parseJSONResponse(content);
      }

      throw new Error(`Unsupported AI provider: ${this.provider}`);
    } catch (error: any) {
      console.error('AI matching error:', error.message);
      throw new Error('Failed to calculate job match');
    }
  }

  async generateCoverLetter(candidateInfo: any, jobInfo: any): Promise<string> {
    const prompt = `Generate a professional cover letter for this candidate applying to this job.

Candidate:
- Name: ${candidateInfo.name}
- Skills: ${candidateInfo.skills.join(', ')}
- Experience: ${candidateInfo.experience || 'See resume for details'}

Job:
- Title: ${jobInfo.title}
- Company: ${jobInfo.companyName}
- Description: ${jobInfo.description}

Write a compelling, personalized cover letter (300-400 words).`;

    try {
      let response: any;

      if (this.provider === 'openai' && this.openai) {
        response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a professional cover letter writer.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 600,
        });

        return response.choices[0].message.content || '';
      } else if (this.provider === 'anthropic' && this.anthropic) {
        response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }],
        });

        return response.content[0].text;
      }

      throw new Error(`Unsupported AI provider: ${this.provider}`);
    } catch (error: any) {
      console.error('Cover letter generation error:', error.message);
      throw new Error('Failed to generate cover letter');
    }
  }

  private parseJSONResponse(content: string): any {
    try {
      let jsonStr = content.trim();

      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      return JSON.parse(jsonStr.trim());
    } catch (error: any) {
      console.error('JSON parsing error:', error.message);
      console.error('Content:', content);
      throw new Error('Invalid JSON response from AI');
    }
  }
}
