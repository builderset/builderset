import orderConfirmed from './order-confirmed';
import orderShipped from './order-shipped';
import receipt from './receipt';
import refundIssued from './refund-issued';

/** What happens after a purchase: the confirmation, the shipment, the receipt, a refund. */
export const ORDERS = [orderConfirmed, orderShipped, receipt, refundIssued];
