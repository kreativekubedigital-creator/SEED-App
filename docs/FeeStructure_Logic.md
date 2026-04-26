# SEED Platform: Dynamic Fee Reconciliation Logic

This document outlines the architectural logic used to link **Fee Structures** and **Fee Analytics**. This system ensures that financial reporting is automatic, accurate, and reflects administrative gaps.

## 1. Core Philosophy
The system moves away from a purely "Invoice-based" reporting model to a "Structure-based" reconciliation model. 
*   **Legacy Model**: Revenue is only tracked if an Invoice exists.
*   **Dynamic Model**: Revenue is expected as soon as a student is enrolled in a class with an active Fee Structure.

## 2. The Logic Map

### Step A: Data Selection
When an admin views the **Student Fee Breakdown**, the system takes three filters:
1.  **Class**: (Specific Class or "All")
2.  **Session**: (Specific Session or "All")
3.  **Term**: (1st, 2nd, 3rd, or "All")

### Step B: The Calculation Loop
For every student matching the filter, the following logic is applied in real-time:

1.  **Identify Expected Debt (`totalFee`)**:
    *   Query the `FeeStructures` collection.
    *   Find entries where:
        *   `classId` matches student's current class.
        *   `sessionId` and `termId` match the current filter.
    *   **Calculation**: Sum all `amount` values from matching structures.

2.  **Identify Actual Payments (`paidAmount`)**:
    *   Query the `Invoices` collection for this student.
    *   Filter invoices by the same `sessionId` and `termId`.
    *   **Calculation**: Sum the `amountPaid` from these invoices. (Note: `amountPaid` is updated whenever a `Payment` record is added).

3.  **Calculate Reconciliation Metrics**:
    *   `Balance Due = Expected Debt - Paid Amount`.
    *   `Status`:
        *   **Paid**: Paid Amount >= Expected Debt.
        *   **Partially Paid**: Paid Amount > 0 AND Paid Amount < Expected Debt.
        *   **Unpaid**: Paid Amount == 0 AND Expected Debt > 0.
        *   **Overdue**: (Unpaid or Partially Paid) AND (Current Date > 1 month post-resumption).
        *   **No Fee**: Expected Debt == 0.

4.  **Identify Administrative Gaps**:
    *   If `Expected Debt > 0` but `Invoices.length == 0`:
        *   Flag as **"Uninvoiced"**. 
        *   *Why?* This student is attending classes but hasn't officially been billed yet.

## 3. Implementation Benefits
*   **Automatic Enrollment Fees**: Adding a student to a class automatically adds them to the "Expected Revenue" chart.
*   **Error Detection**: Admins can immediately see which students are missing invoices for the current term.
*   **Transparency**: Parents and admins see the same "Total Fee" derived from the master structure, preventing manual invoice entry errors.

## 4. Technical Reference (FeeAnalytics.tsx)
The logic is implemented using the `useMemo` hook to ensure performance.
*   **Dependencies**: `students`, `feeStructures`, `invoices`, `payments`.
*   **Output**: A unified `studentFeeData` array containing:
    ```typescript
    {
      studentName: string,
      className: string,
      totalFee: number,      // Derived from FeeStructure
      amountPaid: number,    // Derived from Invoices/Payments
      balance: number,       // totalFee - amountPaid
      status: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue' | 'Uninvoiced'
    }
    ```
