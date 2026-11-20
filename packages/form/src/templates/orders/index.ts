import orderRequest from './order-request';
import returnRequest from './return-request';
import supportTicket from './support-ticket';

/** After a sale, or instead of a shop: an order, a return, a support ticket. */
export const ORDERS = [orderRequest, returnRequest, supportTicket];
