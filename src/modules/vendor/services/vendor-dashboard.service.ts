import { Injectable } from '@nestjs/common';
import { ProductRepository } from 'src/shared/repositories/product.repository';
import { Types } from 'mongoose';
import { ChartType } from '../dto/dashboard-chart.dto';

@Injectable()
export class VendorDashboardService {
    constructor(
        private readonly productRepository: ProductRepository,
    ) { }

    async getStatistics(userId: string) {
        const totalProducts = await this.productRepository.count({
            userId: new Types.ObjectId(userId),
        });

        return {
            totalProducts,
        };
    }

    async getChartData(userId: string, type: ChartType) {
        const userIdObj = new Types.ObjectId(userId);
        let labels: string[] = [];
        let data: number[] = [];

        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date(now);

        switch (type) {
            case ChartType.YEARLY:
                // Current year: Jan to Dec
                startDate = new Date(now.getFullYear(), 0, 1); // January 1st
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // December 31st
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                data = await this.getYearlyData(userIdObj, startDate, endDate);
                break;

            case ChartType.MONTHLY:
                // Current month: Day 1 to last day
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), lastDay.getDate(), 23, 59, 59);
                labels = this.generateDayLabels(startDate, endDate);
                data = await this.getMonthlyData(userIdObj, startDate, endDate);
                break;

            case ChartType.SIX_MONTHS:
                // Last 6 months including current month
                startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 6 months ago
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of current month
                labels = this.generateMonthLabels(startDate, endDate);
                data = await this.getSixMonthsData(userIdObj, startDate, endDate);
                break;
        }

        return {
            label: labels,
            data: data,
        };
    }

    private async getYearlyData(userId: Types.ObjectId, startDate: Date, endDate: Date): Promise<number[]> {
        // Get all products for the vendor in the date range using repository
        const products = await this.productRepository.findByUserId(userId.toString());
        const vendorProducts = products.filter((product: any) => {
            const productObj = product.toObject ? product.toObject() : product;
            const createdAt = productObj.createdAt ? new Date(productObj.createdAt) : null;
            return createdAt && createdAt >= startDate && createdAt <= endDate;
        });

        // Initialize array with 12 zeros (one for each month)
        const monthlyCounts = new Array(12).fill(0);

        // Count products by month
        vendorProducts.forEach((product: any) => {
            const productObj = product.toObject ? product.toObject() : product;
            const createdAt = new Date(productObj.createdAt);
            const monthIndex = createdAt.getMonth(); // 0-11
            monthlyCounts[monthIndex]++;
        });

        return monthlyCounts;
    }

    private async getMonthlyData(userId: Types.ObjectId, startDate: Date, endDate: Date): Promise<number[]> {
        // Get all products for the vendor in the date range using repository
        const products = await this.productRepository.findByUserId(userId.toString());
        const vendorProducts = products.filter((product: any) => {
            const productObj = product.toObject ? product.toObject() : product;
            const createdAt = productObj.createdAt ? new Date(productObj.createdAt) : null;
            return createdAt && createdAt >= startDate && createdAt <= endDate;
        });

        // Get number of days in the month
        const daysInMonth = endDate.getDate();
        const dailyCounts = new Array(daysInMonth).fill(0);

        // Count products by day
        vendorProducts.forEach((product: any) => {
            const productObj = product.toObject ? product.toObject() : product;
            const createdAt = new Date(productObj.createdAt);
            const dayIndex = createdAt.getDate() - 1; // Day 1 = index 0
            if (dayIndex >= 0 && dayIndex < daysInMonth) {
                dailyCounts[dayIndex]++;
            }
        });

        return dailyCounts;
    }

    private async getSixMonthsData(userId: Types.ObjectId, startDate: Date, endDate: Date): Promise<number[]> {
        // Get all products for the vendor in the date range using repository
        const products = await this.productRepository.findByUserId(userId.toString());
        const vendorProducts = products.filter((product: any) => {
            const productObj = product.toObject ? product.toObject() : product;
            const createdAt = productObj.createdAt ? new Date(productObj.createdAt) : null;
            return createdAt && createdAt >= startDate && createdAt <= endDate;
        });

        // Generate month ranges
        const monthRanges = this.generateMonthRanges(startDate, endDate);
        const monthlyCounts = new Array(monthRanges.length).fill(0);

        // Count products by month range
        vendorProducts.forEach((product: any) => {
            const productObj = product.toObject ? product.toObject() : product;
            const createdAt = new Date(productObj.createdAt);

            monthRanges.forEach((range, index) => {
                if (createdAt >= range.start && createdAt <= range.end) {
                    monthlyCounts[index]++;
                }
            });
        });

        return monthlyCounts;
    }

    private generateDayLabels(startDate: Date, endDate: Date): string[] {
        const labels: string[] = [];
        const daysInMonth = endDate.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            labels.push(day.toString());
        }

        return labels;
    }

    private generateMonthLabels(startDate: Date, endDate: Date): string[] {
        const labels: string[] = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const monthName = monthNames[currentDate.getMonth()];
            labels.push(`${monthName} ${currentDate.getFullYear().toString().slice(-2)}`);
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }

        return labels;
    }

    private generateMonthRanges(startDate: Date, endDate: Date): Array<{ start: Date; end: Date }> {
        const ranges: Array<{ start: Date; end: Date }> = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
            ranges.push({ start: monthStart, end: monthEnd });
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }

        return ranges;
    }
}

