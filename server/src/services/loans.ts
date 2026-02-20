import { ILoanRepository, IItemRepository } from '../repositories/interfaces.js';
import { Loan } from '../models/types.js';
import { ulid } from 'ulid';

export class LoanService {
    constructor(
        private loanRepository: ILoanRepository,
        private itemRepository: IItemRepository
    ) {}

    async createLoan(userId: string, itemId: string, data: any): Promise<void> {
        const item = await this.itemRepository.findById(itemId, userId);
        if (!item) throw new Error('Item not found');

        const loan: Loan = {
            id: ulid(),
            itemId,
            borrower: data.borrower,
            note: data.note,
            quantity: parseFloat(data.quantity) || 0,
            lentAt: data.lentAt ? new Date(data.lentAt) : new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.loanRepository.create(loan);
    }

    async updateLoan(userId: string, loanId: string, data: any): Promise<void> {
        const loan = await this.loanRepository.findById(loanId);
        if (!loan) throw new Error('Loan not found');
        
        const item = await this.itemRepository.findById(loan.itemId, userId);
        if (!item) throw new Error('Unauthorized');

        if (data.borrower !== undefined) loan.borrower = data.borrower;
        if (data.note !== undefined) loan.note = data.note;
        if (data.quantity !== undefined) loan.quantity = parseFloat(data.quantity) || 0;
        if (data.lentAt !== undefined) loan.lentAt = new Date(data.lentAt);
        if (data.returnedAt !== undefined) loan.returnedAt = data.returnedAt ? new Date(data.returnedAt) : undefined;
        
        loan.updatedAt = new Date();
        await this.loanRepository.update(loan);
    }

    async returnLoan(userId: string, loanId: string): Promise<void> {
        const loan = await this.loanRepository.findById(loanId);
        if (!loan) throw new Error('Loan not found');
        
        const item = await this.itemRepository.findById(loan.itemId, userId);
        if (!item) throw new Error('Unauthorized');

        loan.returnedAt = new Date();
        loan.updatedAt = new Date();
        await this.loanRepository.update(loan);
    }

    async getLoans(userId: string): Promise<Loan[]> {
        return this.loanRepository.findByUserId(userId);
    }

    async deleteLoan(userId: string, loanId: string): Promise<void> {
        const loan = await this.loanRepository.findById(loanId);
        if (!loan) throw new Error('Loan not found');
        
        const item = await this.itemRepository.findById(loan.itemId, userId);
        if (!item) throw new Error('Unauthorized');

        await this.loanRepository.delete(loanId);
    }
}
