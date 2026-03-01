import { IArtisticQuestionRepository } from '../repositories/interfaces.js';
import { ArtisticQuestion } from '../models/types.js';
import { encrypt, decrypt } from './encryption.js';
import { ulid } from 'ulid';

export class ArtisticQuestionService {
    constructor(
        private questionRepository: IArtisticQuestionRepository
    ) {}

    async createQuestion(userId: string, encryptionKey: Buffer, questionText: string, answerText: string): Promise<string> {
        const id = ulid();
        const question: ArtisticQuestion = {
            id,
            userId,
            question: encrypt(questionText, encryptionKey),
            answer: encrypt(answerText, encryptionKey),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await this.questionRepository.create(question);
        return id;
    }

    async getQuestions(userId: string, encryptionKey: Buffer): Promise<any[]> {
        const questions = await this.questionRepository.findByUserId(userId);
        return questions.map(q => {
            let decryptedQuestion = '[Decryption Failed]';
            let decryptedAnswer = '[Decryption Failed]';

            try {
                decryptedQuestion = decrypt(q.question, encryptionKey).toString();
            } catch (err) {
                console.error(`Failed to decrypt question ${q.id}:`, err);
            }

            try {
                decryptedAnswer = decrypt(q.answer, encryptionKey).toString();
            } catch (err) {
                console.error(`Failed to decrypt answer ${q.id}:`, err);
            }

            return {
                id: q.id,
                userId: q.userId,
                question: decryptedQuestion,
                answer: decryptedAnswer,
                createdAt: q.createdAt,
                updatedAt: q.updatedAt
            };
        });
    }

    async updateQuestion(userId: string, encryptionKey: Buffer, id: string, questionText: string, answerText: string): Promise<void> {
        const existing = await this.questionRepository.findById(id, userId);
        if (!existing) throw new Error('Question not found');

        existing.question = encrypt(questionText, encryptionKey);
        existing.answer = encrypt(answerText, encryptionKey);
        existing.updatedAt = new Date();

        await this.questionRepository.update(existing);
    }

    async deleteQuestion(userId: string, id: string): Promise<void> {
        await this.questionRepository.delete(id, userId);
    }
}
