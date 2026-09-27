'use client';

import { useState, useEffect, useMemo } from 'react';
import { copyToClipboard } from '@/utils/clipboard';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Package,
  Calendar,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Truck,
  CheckSquare,
  ShoppingCart,
  ArrowUpDown,
  MoreHorizontal,
  Copy,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format';
import { toast } from 'sonner';
import { FaWhatsapp } from 'react-icons/fa';
import { useRevenue } from '@/hooks/useRevenue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createPortal } from 'react-dom';
import { getColorByName } from '@/constants/colors';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice?: number;
  image: string;
  selectedColor?: string;
  selectedSize?: {
    id: string;
    label: string;
    price: number;
  } | null;
  selectedOptionGroups?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionLabel: string;
    extraPrice: number;
  }>;
  selectedAddons?: Array<{
    id: string;
    label: string;
    price_delta: number;
  }>;
  wholesaleInfo?: {
    supplierName?: string;
    supplierPhone?: string;
    supplierAddress?: string;
    supplierLogo?: string;
  } | null;
}

interface Order {
  id: string;
  orderCode?: string;
  customerArrived?: boolean;
  arrivedAt?: any;
  purchasedAt?: any;
  warrantyActivated?: boolean;
  warrantyStartDate?: any;
  deliveredAt?: any;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'arrived' | 'on_the_way';
  type?: 'online' | 'reservation'; // Added type
  deliveryInfo: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    notes?: string;
  };
  reservationInfo?: { // Added reservationInfo
    fullName: string;
    phoneNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  couponCode?: string | null;
  couponDiscountAmount?: number;
  supplierName?: string;
  supplierPhone?: string;
}

const getCustomerWhatsAppLink = (order: Order) => {
  const phone = order.deliveryInfo?.phoneNumber || order.reservationInfo?.phoneNumber || '';
  if (!phone) return '#';
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '20' + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
    cleanPhone = '20' + cleanPhone;
  }
  const customerName = order.deliveryInfo?.fullName || order.reservationInfo?.fullName || 'العميل';
  const orderId = order.id.slice(-8);
  const text = `مرحباً ${customerName}، نواصل معك من متجر بازار للموضه بشأن طلبك رقم #${orderId}:`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

type SortConfig = {
  key: keyof Order | 'createdAt' | 'total';
  direction: 'asc' | 'desc';
};

const AdminOrders = () => {
  const { t } = useTranslation();
  const { orders, loading: revenueLoading, refreshData, totalRevenue } = useRevenue();
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });

  // Delete modal state & filter settings
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'filtered' | 'custom'>('filtered');
  const [deleteStatusFilter, setDeleteStatusFilter] = useState<string>('all');
  const [deleteDateTimeFrom, setDeleteDateTimeFrom] = useState<string>('');
  const [deleteDateTimeTo, setDeleteDateTimeTo] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenDeleteModal = (preferredScope?: 'filtered' | 'custom') => {
    if (preferredScope) {
      setDeleteScope(preferredScope);
    } else {
      setDeleteScope(searchTerm.trim() || statusFilter !== 'all' || dateFilter.start || dateFilter.end ? 'filtered' : 'custom');
    }
    setIsDeleteModalOpen(true);
  };

  // Compute orders matching delete criteria
  const ordersToDelete = useMemo(() => {
    if (deleteScope === 'filtered') {
      return filteredOrders;
    }
    return orders.filter(order => {
      // Filter by status
      if (deleteStatusFilter !== 'all' && order.status !== deleteStatusFilter) {
        return false;
      }
      // Filter by date & time from
      if (deleteDateTimeFrom) {
        const fromDate = new Date(deleteDateTimeFrom);
        const orderDate = new Date(order.createdAt);
        if (orderDate < fromDate) return false;
      }
      // Filter by date & time to
      if (deleteDateTimeTo) {
        const toDate = new Date(deleteDateTimeTo);
        const orderDate = new Date(order.createdAt);
        if (orderDate > toDate) return false;
      }
      return true;
    });
  }, [orders, filteredOrders, deleteScope, deleteStatusFilter, deleteDateTimeFrom, deleteDateTimeTo]);

  // Execute deletion of matched orders
  const handleDeleteOrders = async () => {
    if (ordersToDelete.length === 0) {
      toast.error('لا توجد طلبات تطابق معايير التصفية المحددة للحذف');
      return;
    }

    const confirmText = ordersToDelete.length === 1
      ? `تحذير هام:\nهل أنت متأكد من حذف هذا الطلب نهائياً من قاعدة البيانات (Firebase)؟\n\nلا يمكن التراجع عن هذا الإجراء إطلاقاً.`
      : `تحذير هام:\nهل أنت متأكد من حذف ${ordersToDelete.length} طلب نهائياً من قاعدة البيانات (Firebase)؟\n\nلا يمكن التراجع عن هذا الإجراء إطلاقاً.`;

    if (!window.confirm(confirmText)) {
      return;
    }

    setIsDeleting(true);
    toast.loading(`جاري حذف ${ordersToDelete.length} طلب من Firebase...`, { id: 'delete-orders-toast' });

    try {
      const deletePromises = ordersToDelete.map(order => deleteDoc(doc(db, 'orders', order.id)));
      await Promise.all(deletePromises);

      toast.success(
        ordersToDelete.length === 1
          ? 'تم حذف الطلب بنجاح من Firebase'
          : `تم حذف ${ordersToDelete.length} طلب بنجاح من Firebase`,
        { id: 'delete-orders-toast' }
      );

      // If selectedOrder was one of the deleted orders, close details modal
      if (selectedOrder && ordersToDelete.some(o => o.id === selectedOrder.id)) {
        setSelectedOrder(null);
        setShowOrderDetails(false);
      }

      // Refresh orders list
      await refreshData();

      // Reset delete state and close modal
      setIsDeleteModalOpen(false);
      setDeleteStatusFilter('all');
      setDeleteDateTimeFrom('');
      setDeleteDateTimeTo('');
    } catch (err: any) {
      console.error('Error deleting orders:', err);
      toast.error(err.message || 'حدث خطأ أثناء حذف الطلبات', { id: 'delete-orders-toast' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete a single order directly
  const handleDeleteSingleOrder = async (order: Order) => {
    const customerName = order.deliveryInfo?.fullName || order.reservationInfo?.fullName || 'العميل';
    const orderNum = order.orderCode || `#${order.id.slice(-6)}`;
    if (!window.confirm(`هل أنت متأكد من حذف الطلب (${orderNum}) الخاص بـ "${customerName}" نهائياً من قاعدة البيانات (Firebase)؟`)) {
      return;
    }

    try {
      toast.loading('جاري حذف الطلب من Firebase...', { id: 'delete-single-order' });
      await deleteDoc(doc(db, 'orders', order.id));
      toast.success(`تم حذف الطلب ${orderNum} بنجاح من Firebase`, { id: 'delete-single-order' });

      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
        setShowOrderDetails(false);
      }

      await refreshData();
    } catch (err: any) {
      console.error('Error deleting single order:', err);
      toast.error(err.message || 'حدث خطأ أثناء حذف الطلب', { id: 'delete-single-order' });
    }
  };


  useEffect(() => {
    filterData();
  }, [orders, searchTerm, statusFilter, dateFilter, sortConfig]);

  const filterData = () => {
    let filtered = [...orders];

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        (order.deliveryInfo?.fullName && order.deliveryInfo.fullName.toLowerCase().includes(lowerTerm)) ||
        (order.reservationInfo?.fullName && order.reservationInfo.fullName.toLowerCase().includes(lowerTerm)) ||
        (order.deliveryInfo?.phoneNumber && order.deliveryInfo.phoneNumber.includes(lowerTerm)) ||
        (order.reservationInfo?.phoneNumber && order.reservationInfo.phoneNumber.includes(lowerTerm)) ||
        order.id.toLowerCase().includes(lowerTerm) ||
        (order.orderCode && order.orderCode.toLowerCase().includes(lowerTerm))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by date range
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => new Date(order.createdAt) >= startDate);
    }
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.createdAt) <= endDate);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle dates specifically if sort key is createdAt or updatedAt
      if (sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredOrders(filtered);
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const exportOrdersToJson = () => {
    const formattedOrders = filteredOrders.map(order => {
      const isReservation = order.type === 'reservation';
      const customerInfo = isReservation ? order.reservationInfo : order.deliveryInfo;

      const formattedItems = order.items.map(item => {
        let optionsStr = '';
        if (item.selectedOptionGroups && item.selectedOptionGroups.length > 0) {
          optionsStr = item.selectedOptionGroups.map(g => `${g.groupName}: ${g.optionLabel}`).join(' | ');
        }

        let addonsStr = '';
        if (item.selectedAddons && item.selectedAddons.length > 0) {
          addonsStr = item.selectedAddons.map(a => a.label).join('، ');
        }

        let itemData: any = {
          "اسم المنتج": item.productName,
          "السعر": item.price,
          "الكمية": item.quantity,
        };

        if (optionsStr || addonsStr || item.selectedSize || item.selectedColor) {
          let details = [];
          if (item.selectedSize) details.push(`الحجم: ${item.selectedSize.label}`);
          if (item.selectedColor) details.push(`اللون: ${getColorByName(item.selectedColor)?.name || item.selectedColor}`);
          if (optionsStr) details.push(`المواصفات: ${optionsStr}`);
          if (addonsStr) details.push(`الإضافات: ${addonsStr}`);

          itemData["تفاصيل إضافية"] = details.join(' - ');
        }

        return itemData;
      });

      let orderData: any = {
        "اسم الزبون": customerInfo?.fullName || 'غير محدد',
        "رقم الهاتف": customerInfo?.phoneNumber || 'غير محدد',
      };

      if (!isReservation && order.deliveryInfo) {
        orderData["المحافظة"] = order.deliveryInfo.city;
        orderData["العنوان"] = order.deliveryInfo.address;
      } else if (isReservation && order.reservationInfo) {
        orderData["تاريخ الحجز"] = order.reservationInfo.appointmentDate;
        orderData["وقت الحجز"] = order.reservationInfo.appointmentTime;
      }

      if (customerInfo?.notes) {
        orderData["الملاحظات"] = customerInfo.notes;
      }

      orderData["نوع الطلب"] = isReservation ? "حجز منتج في الفرع" : "شراء أونلاين";
      orderData["المنتجات"] = formattedItems;

      if (order.couponCode) {
        orderData["كوبون الخصم"] = `${order.couponCode} (-${order.couponDiscountAmount || 0} جنيه)`;
      }

      orderData["السعر النهائي"] = order.total;
      orderData["تاريخ الطلب"] = formatDateTime(order.createdAt);

      return orderData;
    });

    const dataStr = JSON.stringify(formattedOrders, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير البيانات بنجاح");
  };

  const copyOrderDetails = async (order: Order) => {
    // 1. Format Items
    const itemsText = order.items.map((item, index) => {
      const lines: string[] = [];
      lines.push(`${index + 1}. ${item.productName}`);
      lines.push(`   الكمية: ${item.quantity}`);
      if (item.selectedSize) lines.push(`   الحجم: ${item.selectedSize.label}`);

      if (item.selectedColor) {
        const colorName = getColorByName(item.selectedColor).name || item.selectedColor;
        lines.push(`   اللون: ${colorName}`);
      }

      if (item.selectedOptionGroups && item.selectedOptionGroups.length > 0) {
        lines.push(`   المواصفات: ${item.selectedOptionGroups.map(opt => `${opt.groupName}: ${opt.optionLabel}`).join(' | ')}`);
      }

      if (item.selectedAddons && item.selectedAddons.length > 0) {
        lines.push(`   الإضافات: ${item.selectedAddons.map(a => a.label).join(', ')}`);
      }
      lines.push(`   السعر: ${formatCurrency(item.price * item.quantity, 'جنيه')}`);
      return lines.join('\n');
    }).join('\n\n');

    // 2. Format Details based on type
    let detailsText = '';
    let title = '';

    if (order.type === 'reservation' && order.reservationInfo) {
      title = `📅 طلب حجز منتج بالفرع - #${order.id.slice(-8)}`;
      detailsText = [
        `👤 اسم العميل: ${order.reservationInfo.fullName}`,
        `📱 هاتف العميل: ${order.reservationInfo.phoneNumber}`,
        `📅 تاريخ الحجز: ${order.reservationInfo.appointmentDate}`,
        `⏰ وقت الاستلام: ${(() => {
          const time = order.reservationInfo.appointmentTime;
          if (!time) return '';
          const [hoursStr, minutes] = time.split(':');
          let hours = parseInt(hoursStr, 10);
          let suffix = 'صباحاً';
          if (hours >= 12) {
            if (hours >= 12 && hours < 15) suffix = 'ظهراً';
            else if (hours >= 15 && hours < 18) suffix = 'عصراً';
            else suffix = 'مساءً';
            if (hours > 12) hours -= 12;
          } else if (hours === 0) {
            hours = 12;
          }
          return `${hours}:${minutes} ${suffix}`;
        })()}`,
        order.reservationInfo.notes ? `📝 ملاحظات العميل: ${order.reservationInfo.notes}` : null,
      ].filter(Boolean).join('\n');
    } else {
      title = `🚀 طلب شحن أونلاين جديد - #${order.id.slice(-8)}`;
      detailsText = [
        `👤 اسم العميل: ${order.deliveryInfo.fullName}`,
        `📱 هاتف العميل: ${order.deliveryInfo.phoneNumber}`,
        `🏙 المحافظة: ${order.deliveryInfo.city}`,
        `📍 العنوان بالتفصيل: ${order.deliveryInfo.address}`,
        order.deliveryInfo.notes ? `📝 ملاحظات العميل: ${order.deliveryInfo.notes}` : null,
      ].filter(Boolean).join('\n');
    }

    // Supplier Info
    const supplierName = order.supplierName || order.items[0]?.wholesaleInfo?.supplierName || 'تاجر عام';
    const supplierPhone = order.supplierPhone || order.items[0]?.wholesaleInfo?.supplierPhone || '';
    const sellerText = supplierPhone
      ? `🏪 التاجر: ${supplierName} (${supplierPhone})`
      : `🏪 التاجر: ${supplierName}`;

    // 3. Construct Message
    const message = [
      title,
      `الحالة الحالية: ${getStatusText(order.status)}`,
      '----------------------------------------',
      '🛒 المنتجات المطلوبة:',
      itemsText,
      '----------------------------------------',
      order.type === 'reservation' ? '📅 تفاصيل موعد الحجز:' : '🚚 تفاصيل عنوان الشحن:',
      detailsText,
      '----------------------------------------',
      sellerText,
      '----------------------------------------',
      order.couponCode ? `🎟 الكوبون المستخدم: ${order.couponCode} (خصم: ${formatCurrency(order.couponDiscountAmount || 0, 'جنيه')})` : null,
      `💰 المبلغ الإجمالي للطلب: ${formatCurrency(order.total, 'جنيه')}`,
      `📅 تاريخ ووقت الطلب: ${new Date(order.createdAt).toLocaleDateString('ar-EG')} ${new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
      '----------------------------------------'
    ].filter(Boolean).join('\n');

    // 4. Copy to clipboard
    const success = await copyToClipboard(message);
    if (success) {
      toast.success("تم نسخ تفاصيل الطلب بنجاح");
    } else {
      toast.error("فشل نسخ تفاصيل الطلب");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData: Record<string, any> = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      // When marking as delivered, record warranty activation timestamp
      if (newStatus === 'delivered') {
        updateData.warrantyActivated = true;
        updateData.warrantyStartDate = serverTimestamp();
        updateData.deliveredAt = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);

      await refreshData();
      toast.success(`تم تحديث حالة الطلب إلى ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  const getStatusText = (status: Order['status']) => {
    const statusMap: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'تم استلام الطلب',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
      arrived: 'تم وصول العميل للفرع 📍',
      on_the_way: 'في الطريق 🚗',
    };
    return statusMap[status] || status;
  };

  const getNextStepConfig = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          nextStatus: 'confirmed' as Order['status'],
          actionText: 'تم استلام الطلب',
          icon: '✅',
          className: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-2 ring-blue-400/20',
          disabled: false,
        };
      case 'confirmed':
        return {
          nextStatus: 'processing' as Order['status'],
          actionText: '  قيد التجهيز',
          icon: '📦',
          className: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-400/20',
          disabled: false,
        };
      case 'processing':
        return {
          nextStatus: 'shipped' as Order['status'],
          actionText: '  تم الشحن',
          icon: '🚚',
          className: 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm ring-2 ring-purple-400/20',
          disabled: false,
        };
      case 'shipped':
        return {
          nextStatus: 'delivered' as Order['status'],
          actionText: '  تم التوصيل',
          icon: '🎉',
          className: 'bg-green-600 hover:bg-green-700 text-white shadow-sm ring-2 ring-green-400/20',
          disabled: false,
        };
      case 'delivered':
        return {
          nextStatus: null,
          actionText: 'تم تسليم الطلب ',
          icon: '✨',
          className: 'bg-green-100 text-green-800 cursor-default opacity-90 border border-green-200',
          disabled: true,
        };
      case 'cancelled':
      default:
        return {
          nextStatus: null,
          actionText: 'الطلب ملغي',
          icon: '❌',
          className: 'bg-gray-100 text-gray-500 cursor-default opacity-80 border border-gray-200',
          disabled: true,
        };
    }
  };

  // Reservation-specific progression: pending/confirmed → on_the_way → arrived → delivered
  const getReservationNextStepConfig = (status: Order['status']) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return {
          nextStatus: 'on_the_way' as Order['status'],
          actionText: 'في الطريق إلى المحل',
          icon: '🚗',
          className: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-2 ring-blue-400/20',
          disabled: false,
        };
      case 'on_the_way':
        return {
          nextStatus: 'arrived' as Order['status'],
          actionText: 'وصل العميل للمحل',
          icon: '📍',
          className: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/20',
          disabled: false,
        };
      case 'arrived':
        return {
          nextStatus: 'delivered' as Order['status'],
          actionText: 'تم الشراء وتفعيل الضمان',
          icon: '🛡️',
          className: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm ring-2 ring-amber-400/20',
          disabled: false,
        };
      case 'delivered':
        return {
          nextStatus: null,
          actionText: 'تم الشراء وفعّل الضمان ✨',
          icon: '✨',
          className: 'bg-green-100 text-green-800 cursor-default opacity-90 border border-green-200',
          disabled: true,
        };
      case 'cancelled':
      default:
        return {
          nextStatus: null,
          actionText: 'الحجز ملغي',
          icon: '❌',
          className: 'bg-gray-100 text-gray-500 cursor-default opacity-80 border border-gray-200',
          disabled: true,
        };
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig: Record<string, any> = {
      pending: { color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', icon: Clock, text: 'قيد الانتظار' },
      confirmed: { color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', icon: CheckCircle, text: 'تم استلام الطلب' },
      processing: { color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200', icon: Package, text: 'قيد التجهيز' },
      shipped: { color: 'bg-purple-100 text-purple-800 hover:bg-purple-200', icon: Truck, text: 'تم الشحن' },
      delivered: { color: 'bg-green-100 text-green-800 hover:bg-green-200', icon: CheckSquare, text: 'تم التوصيل' },
      cancelled: { color: 'bg-red-100 text-red-800 hover:bg-red-200', icon: XCircle, text: 'ملغي' },
      arrived: { color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 ring-1 ring-emerald-400 font-bold', icon: MapPin, text: 'وصل العميل للفرع 📍' },
      on_the_way: { color: 'bg-blue-100 text-blue-900 hover:bg-blue-200 ring-1 ring-blue-400 font-bold', icon: Truck, text: 'في الطريق 🚗' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0 px-2.5 py-1 text-xs whitespace-nowrap inline-flex items-center shrink-0`}>
        <Icon className="h-3 w-3 mr-1 shrink-0" />
        <span>{config.text}</span>
      </Badge>
    );
  };

  if (revenueLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container py-8 max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">إدارة الطلبات</h1>
              <p className="text-muted-foreground mt-1">
                نظرة شاملة على جميع الطلبات وحالاتها
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleOpenDeleteModal()}
              variant="destructive"
              className="gap-2 shadow-sm font-semibold"
              title="حذف الطلبات من Firebase"
            >
              <Trash2 className="h-4 w-4" />
              <span>{searchTerm.trim() ? `حذف نتائج البحث (${filteredOrders.length})` : 'حذف الطلبات'}</span>
            </Button>
            <Button
              onClick={exportOrdersToJson}
              variant="outline"
              className="gap-2 bg-white shadow-sm border-gray-200 hover:bg-gray-50"
              title="تصدير بيانات الطلبات (JSON)"
            >
              <Download className="h-4 w-4" />
              <span>تصدير JSON</span>
            </Button>
            <Card className="px-4 py-2 bg-white shadow-sm border-none">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">الإجمالي:</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue, 'جنيه')}</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters & Search */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="بحث بالاسم، رقم الهاتف، أو رقم الطلب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="الحالة" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="confirmed">تم استلام الطلب</SelectItem>
                    <SelectItem value="on_the_way">في الطريق 🚗</SelectItem>
                    <SelectItem value="arrived">وصل العميل للفرع 📍</SelectItem>
                    <SelectItem value="processing">قيد التجهيز</SelectItem>
                    <SelectItem value="shipped">تم الشحن</SelectItem>
                    <SelectItem value="delivered">تم التوصيل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-md border">
                  <Input
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                    className="w-auto h-9 border-none bg-transparent focus-visible:ring-0 text-sm"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                    className="w-auto h-9 border-none bg-transparent focus-visible:ring-0 text-sm"
                  />
                </div>

                <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                  {filteredOrders.length} طلب
                </div>

                {searchTerm.trim() && filteredOrders.length > 0 && (
                  <Button
                    onClick={() => handleOpenDeleteModal('filtered')}
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 h-9 font-bold shadow-sm animate-in fade-in duration-200"
                    title="حذف الطلبات المفلترة بحقل البحث نهائياً من Firebase"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>حذف نتائج البحث ({filteredOrders.length})</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-dashed">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || dateFilter.start
                ? 'لم يتم العثور على طلبات تطابق معايير البحث الحالية.'
                : 'لم يتم استلام أي طلبات حتى الآن.'}
            </p>
            {(searchTerm || statusFilter !== 'all' || dateFilter.start) && (
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter({ start: '', end: '' });
                }}
              >
                مسح التصفيات
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="w-[120px] text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-2">
                        التاريخ
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('total')}>
                      <div className="flex items-center gap-2">
                        الإجمالي
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderDetails(true);
                    }}>
                      <TableCell className="font-medium text-primary font-mono text-xs">
                        {order.orderCode || `#${order.id.slice(-6)}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{order.deliveryInfo?.fullName || order.reservationInfo?.fullName || '—'}</span>
                          <span className="text-xs text-muted-foreground">{order.deliveryInfo?.phoneNumber || order.reservationInfo?.phoneNumber || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex flex-col">
                          <span>{formatDate(order.createdAt)}</span>
                          <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex">
                          {getStatusBadge(order.status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">{formatCurrency(order.total, 'جنيه')}</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyOrderDetails(order)}>
                              <Copy className="mr-2 h-4 w-4" />
                              نسخ التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>تحديث الحالة</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                              ✅ تم استلام الطلب
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'processing')}>
                              📦 قيد التجهيز
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'shipped')}>
                              🚚 تم الشحن
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}>
                              🎉 تم التوصيل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                              ❌ إلغاء الطلب
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer gap-2"
                              onClick={() => handleDeleteSingleOrder(order)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                              <span>حذف الطلب نهائياً</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden border-none shadow-sm" onClick={() => {
                  setSelectedOrder(order);
                  setShowOrderDetails(true);
                }}>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">#{order.id.slice(-8)}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="flex items-center gap-3 py-2">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{order.deliveryInfo.fullName}</p>
                        <p className="text-xs text-muted-foreground">{order.deliveryInfo.phoneNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                      <span className="font-bold text-lg text-primary">{formatCurrency(order.total, 'جنيه')}</span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteSingleOrder(order)}
                          title="حذف هذا الطلب نهائياً"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                        >
                          عرض التفاصيل
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Order Details Modal via Portal */}
        {showOrderDetails && selectedOrder && createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
            onClick={() => setShowOrderDetails(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Fixed at top */}
              <div className="flex-none bg-white border-b px-3.5 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center justify-between gap-2">
                  {/* Title & Order Code & Badge */}
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 shrink-0">
                      تفاصيل الطلب
                    </h2>

                    {/* Copyable Order Code Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        const code = selectedOrder.orderCode || selectedOrder.id;
                        await copyToClipboard(code);
                        toast.success(`تم نسخ رقم الطلب: ${code}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-primary/10 text-gray-800 hover:text-primary transition-colors text-xs font-mono font-bold border border-gray-200/80 cursor-pointer"
                      title="انقر لنسخ رقم الطلب"
                    >
                      <span dir="ltr">#{selectedOrder.orderCode || selectedOrder.id.slice(-8)}</span>
                      <Copy className="h-3 w-3 opacity-60" />
                    </button>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>

                  {/* Actions: Copy & Close */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyOrderDetails(selectedOrder)}
                      className="h-8 px-2 sm:px-3 text-xs gap-1.5 text-primary border-primary/20 hover:bg-primary/5 hover:text-primary shrink-0"
                      title="نسخ جميع تفاصيل الطلب"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline sm:inline">نسخ التفاصيل</span>
                      <span className="inline xs:hidden sm:hidden">نسخ</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowOrderDetails(false)}
                      className="h-8 w-8 hover:bg-gray-100 rounded-full text-gray-500 shrink-0"
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
                {/* Info Grid - 1 col on mobile, 3 cols on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
                  {/* Column 1: Customer Info */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      معلومات العميل
                    </h3>
                    <div className="bg-gray-50/70 p-3 sm:p-4 rounded-xl space-y-2.5 text-xs sm:text-sm border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">الاسم:</span>
                        <span className="font-semibold text-gray-900">{selectedOrder.deliveryInfo?.fullName || selectedOrder.reservationInfo?.fullName || 'غير محدد'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">الهاتف:</span>
                        <span className="font-semibold text-right font-mono" dir="ltr">
                          {selectedOrder.deliveryInfo?.phoneNumber || selectedOrder.reservationInfo?.phoneNumber || 'غير محدد'}
                        </span>
                      </div>

                      {(selectedOrder.deliveryInfo?.phoneNumber || selectedOrder.reservationInfo?.phoneNumber) && (
                        <div className="pt-1">
                          <a
                            href={getCustomerWhatsAppLink(selectedOrder)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                          >
                            <FaWhatsapp className="h-4 w-4" />
                            <span>تواصل واتساب مع العميل</span>
                          </a>
                        </div>
                      )}

                      {selectedOrder.type === 'reservation' && selectedOrder.reservationInfo ? (
                        <>
                          <div className="pt-2 border-t mt-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                حجز موعد
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white p-2 rounded-lg border">
                                <p className="text-[11px] text-muted-foreground mb-1">تاريخ الحجز</p>
                                <div className="font-medium text-xs flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span className="truncate">{selectedOrder.reservationInfo.appointmentDate}</span>
                                </div>
                              </div>
                              <div className="bg-white p-2 rounded-lg border">
                                <p className="text-[11px] text-muted-foreground mb-1">وقت الحجز</p>
                                <div className="font-medium text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span className="truncate">{(() => {
                                    const time = selectedOrder.reservationInfo.appointmentTime;
                                    if (!time) return '';
                                    const [hoursStr, minutes] = time.split(':');
                                    let hours = parseInt(hoursStr, 10);
                                    let suffix = 'صباحاً';

                                    if (hours >= 12) {
                                      if (hours >= 12 && hours < 15) suffix = 'ظهراً';
                                      else if (hours >= 15 && hours < 18) suffix = 'عصراً';
                                      else suffix = 'مساءً';

                                      if (hours > 12) hours -= 12;
                                    } else if (hours === 0) {
                                      hours = 12;
                                    }
                                    return `${hours}:${minutes} ${suffix}`;
                                  })()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">الموقع:</span>
                            <span className="font-medium text-right">{selectedOrder.deliveryInfo.city}</span>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground mb-1">العنوان بالتفصيل:</p>
                            <p className="font-medium leading-relaxed">{selectedOrder.deliveryInfo.address}</p>
                          </div>
                        </>
                      )}

                      {(selectedOrder.deliveryInfo.notes || selectedOrder.reservationInfo?.notes) && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground mb-1">ملاحظات:</p>
                          <p className="font-medium text-amber-600">
                            {selectedOrder.type === 'reservation' && selectedOrder.reservationInfo?.notes
                              ? selectedOrder.reservationInfo.notes
                              : selectedOrder.deliveryInfo.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Order Summary */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      ملخص الطلب
                    </h3>
                    <div className="bg-gray-50/70 p-3 sm:p-4 rounded-xl space-y-2.5 text-xs sm:text-sm border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">تاريخ الطلب:</span>
                        <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">وقت الطلب:</span>
                        <span className="font-medium">{new Date(selectedOrder.createdAt).toLocaleTimeString('ar-EG')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">عدد المنتجات:</span>
                        <span className="font-medium">{selectedOrder.items.length} منتجات</span>
                      </div>
                      {selectedOrder.couponCode && (
                        <div className="flex justify-between items-center text-amber-700 bg-amber-50 px-2 py-1 rounded">
                          <span>كوبون الخصم:</span>
                          <span className="font-bold">{selectedOrder.couponCode}</span>
                        </div>
                      )}
                      <div className="pt-2.5 border-t flex justify-between items-center">
                        <span className="font-bold text-sm sm:text-base">الإجمالي:</span>
                        <span className="font-black text-base sm:text-xl text-primary">{formatCurrency(selectedOrder.total, 'جنيه')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Supplier Details */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      بيانات التاجر
                    </h3>
                    <div className="bg-gray-50/70 p-3 sm:p-4 rounded-xl space-y-2.5 text-xs sm:text-sm border border-gray-100">
                      {(() => {
                        const supplierName = selectedOrder.supplierName || selectedOrder.items[0]?.wholesaleInfo?.supplierName || 'تاجر عام';
                        const supplierPhone = selectedOrder.supplierPhone || selectedOrder.items[0]?.wholesaleInfo?.supplierPhone || '';

                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">التاجر:</span>
                              <span className="font-bold text-gray-900">{supplierName}</span>
                            </div>
                            {supplierPhone ? (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">الهاتف:</span>
                                  <span className="font-medium text-right font-mono" dir="ltr">{supplierPhone}</span>
                                </div>
                                <div className="pt-2 border-t mt-1">
                                  <a
                                    href={`https://wa.me/20${supplierPhone.replace(/^0/, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                                  >
                                    <FaWhatsapp className="h-3.5 w-3.5" />
                                    <span>تواصل واتساب مع التاجر</span>
                                  </a>
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-gray-400 italic pt-2 border-t mt-1 text-center">
                                لا توجد بيانات اتصال للتاجر
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items List */}
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    المنتجات ({selectedOrder.items.length})
                  </h3>
                  <div className="border rounded-2xl overflow-hidden bg-white shadow-sm divide-y divide-gray-100">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="p-3 sm:p-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex gap-3 sm:gap-4 items-start">
                          {/* Image */}
                          <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
                              <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
                                {item.productName}
                              </h4>
                              <span className="font-black text-sm sm:text-base text-primary whitespace-nowrap">
                                {formatCurrency(item.totalPrice || (item.price * item.quantity), 'جنيه')}
                              </span>
                            </div>

                            {/* Badges / Options */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {item.selectedSize && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] sm:text-xs bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                                  <span>الحجم: {item.selectedSize.label}</span>
                                </span>
                              )}

                              {item.selectedOptionGroups && item.selectedOptionGroups.map((opt, i) => (
                                <span
                                  key={`opt-${i}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] sm:text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium"
                                >
                                  <span>{opt.groupName}: {opt.optionLabel}</span>
                                </span>
                              ))}

                              {item.selectedAddons && item.selectedAddons.map((addon, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] sm:text-xs bg-amber-50 border border-amber-100 text-amber-800 font-medium"
                                >
                                  <span>{addon.label}</span>
                                  {addon.price_delta > 0 && (
                                    <span className="text-amber-600 font-bold">
                                      (+{formatCurrency(addon.price_delta, '')})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>

                            {/* Quantity & Unit price */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>الكمية: <strong className="text-gray-900">{item.quantity}</strong></span>
                              <span>•</span>
                              <span>{formatCurrency(item.price, 'جنيه')} للقطعة</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Warranty Banner (shown when order is delivered) ── */}
              {selectedOrder.status === 'delivered' && (
                <div className="mx-3.5 sm:mx-6 mb-4 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100/60 rounded-2xl border-2 border-green-300 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <span className="text-lg">🛡️</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-sm font-black text-green-900 flex items-center gap-1.5">
                        تم تفعيل ضمان bazar fashion
                        {selectedOrder.warrantyActivated && (
                          <span className="text-[10px] font-bold bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full">مفعّل ✅</span>
                        )}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-green-800 leading-relaxed font-medium">
                        تم تسجيل بدء الضمان من لحظة التسليم. يجب أن يطابق التاريخ أدناه التاريخ المكتوب على فاتورة المحل.
                      </p>
                      <div className="mt-2 bg-white/70 border border-green-200 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                        <span className="text-[11px] text-green-700">🕐 <strong>تاريخ بدء الضمان:</strong></span>
                        <span className="text-[11px] font-black text-green-900 font-mono" dir="ltr">
                          {selectedOrder.warrantyStartDate
                            ? (selectedOrder.warrantyStartDate?.toDate
                              ? selectedOrder.warrantyStartDate.toDate().toLocaleString('ar-EG')
                              : new Date(selectedOrder.warrantyStartDate).toLocaleString('ar-EG'))
                            : selectedOrder.deliveredAt
                              ? (selectedOrder.deliveredAt?.toDate
                                ? selectedOrder.deliveredAt.toDate().toLocaleString('ar-EG')
                                : new Date(selectedOrder.deliveredAt).toLocaleString('ar-EG'))
                              : formatDateTime(selectedOrder.updatedAt)}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-700 font-bold pt-1">
                        ⚠️ تأكد من مطابقة هذا التاريخ مع الفاتورة الورقية الصادرة من المحل.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer - Single Dynamic Progression Button + Cancel Button */}
              {(() => {
                const isReservationOrder = selectedOrder.type === 'reservation';
                const nextConfig = isReservationOrder
                  ? getReservationNextStepConfig(selectedOrder.status)
                  : getNextStepConfig(selectedOrder.status);
                const canCancel = selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered';

                return (
                  <div className="flex-none bg-gray-50/95 backdrop-blur-sm p-3.5 sm:p-4 border-t">
                    {/* Reservation stage labels */}
                    {isReservationOrder && (
                      <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-medium text-gray-500 flex-wrap">
                        {['تسجيل الحجز', 'في الطريق', 'وصلت المحل', 'تأكيد الشراء'].map((label, i) => {
                          const statuses = ['pending', 'on_the_way', 'arrived', 'delivered'];
                          const currentIdx = statuses.indexOf(selectedOrder.status === 'confirmed' ? 'pending' : selectedOrder.status);
                          const done = currentIdx >= i;
                          return (
                            <span key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${done ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-100 text-gray-400 border-gray-200'
                              }`}>
                              {done ? '✅' : `${i + 1}.`} {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      {/* Current Status Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">المرحلة الحالية:</span>
                        {getStatusBadge(selectedOrder.status)}
                      </div>

                      {/* Action Buttons: Next Stage Button + Cancel Button */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Dynamic Next Stage Button */}
                        <Button
                          disabled={nextConfig.disabled}
                          onClick={async () => {
                            if (nextConfig.nextStatus) {
                              await updateOrderStatus(selectedOrder.id, nextConfig.nextStatus);
                              setSelectedOrder(prev => prev ? { ...prev, status: nextConfig.nextStatus!, updatedAt: new Date() } : null);
                            }
                          }}
                          className={`flex-1 sm:flex-none h-10 px-4 text-xs sm:text-sm font-bold gap-2 transition-all duration-200 ${nextConfig.className}`}
                        >
                          <span className="text-base">{nextConfig.icon}</span>
                          <span>{nextConfig.actionText}</span>
                        </Button>

                        {/* Cancel Button */}
                        {canCancel && (
                          <Button
                            variant="outline"
                            onClick={async () => {
                              if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
                                await updateOrderStatus(selectedOrder.id, 'cancelled');
                                setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled', updatedAt: new Date() } : null);
                              }
                            }}
                            className="h-10 px-3.5 text-xs sm:text-sm text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold gap-1.5 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>إلغاء الطلب</span>
                          </Button>
                        )}

                        {/* Delete Single Order Button */}
                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteSingleOrder(selectedOrder)}
                          className="h-10 px-3 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 gap-1.5 transition-colors font-medium"
                          title="حذف هذا الطلب نهائياً من Firebase"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="hidden sm:inline">حذف نهائي</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>,
          document.body
        )}
        {/* Delete Orders Modal Dialog */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader className="text-right space-y-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                حذف الطلبات من Firebase
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {deleteScope === 'filtered'
                  ? 'سيتم حذف الطلبات المعروضة حالياً وفق نتائج البحث/التصفية نهائياً من قاعدة بيانات Firebase.'
                  : 'قم بتحديد معايير التصفية للطلبات التي تريد حذفها نهائياً بحسب الحالة أو الفترة الزمنية.'}
              </DialogDescription>
            </DialogHeader>

            {/* Scope Switcher if active filter or search exists */}
            {(searchTerm.trim() || statusFilter !== 'all' || dateFilter.start || dateFilter.end) && (
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDeleteScope('filtered')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${deleteScope === 'filtered'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>الطلبات المفلترة ({filteredOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteScope('custom')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${deleteScope === 'custom'
                    ? 'bg-white text-gray-900 shadow-sm border'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>تصفية مخصصة (تاريخ / حالة)</span>
                </button>
              </div>
            )}

            {deleteScope === 'filtered' ? (
              <div className="space-y-3 py-2">
                {/* Search Information Box */}
                {searchTerm.trim() && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-amber-700 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-amber-900">
                        تصفية بحقل البحث: <strong>"{searchTerm}"</strong>
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-white text-amber-800 border-amber-300 font-bold shrink-0">
                      {filteredOrders.length} طلب
                    </Badge>
                  </div>
                )}

                {/* List Preview of Orders to be deleted */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                    <span>الطلبات المتبقية المحددة للحذف ({ordersToDelete.length}):</span>
                    <span className="text-[11px] text-gray-500">حذف نهائي من Firebase</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 border rounded-xl p-2.5 bg-gray-50/50 divide-y divide-gray-100">
                    {ordersToDelete.length === 0 ? (
                      <p className="text-center py-6 text-xs text-gray-500">لا توجد طلبات مطابقة للحذف.</p>
                    ) : (
                      ordersToDelete.map((ord) => (
                        <div key={ord.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 font-mono">
                                {ord.orderCode || `#${ord.id.slice(-6)}`}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="font-medium text-gray-800 truncate">
                                {ord.deliveryInfo?.fullName || ord.reservationInfo?.fullName || 'بدون اسم'}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                              <span>{ord.deliveryInfo?.phoneNumber || ord.reservationInfo?.phoneNumber || ''}</span>
                              <span>•</span>
                              <span>{formatDate(ord.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <span className="font-bold text-gray-900 block">{formatCurrency(ord.total, 'جنيه')}</span>
                            <span className="text-[10px] text-gray-500">{getStatusText(ord.status)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Warning Card */}
                <div className="p-3.5 rounded-xl border bg-red-50/80 border-red-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-xs sm:text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>تحذير هام</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-red-600 leading-relaxed font-medium">
                    سيتم حذف <strong>{ordersToDelete.length === 1 ? 'هذا الطلب' : `${ordersToDelete.length} طلبات`}</strong> نهائياً من قاعدة بيانات Firebase. لا يمكن استرجاع البيانات بعد الحذف.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-3">
                {/* Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">تصفية حسب الحالة</label>
                  <Select value={deleteStatusFilter} onValueChange={setDeleteStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات (كل الطلبات)</SelectItem>
                      <SelectItem value="pending">قيد الانتظار (pending)</SelectItem>
                      <SelectItem value="confirmed">تم استلام الطلب (confirmed)</SelectItem>
                      <SelectItem value="shipped">تم الشحن (shipped)</SelectItem>
                      <SelectItem value="delivered">تم التوصيل (delivered)</SelectItem>
                      <SelectItem value="cancelled">ملغي (cancelled)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Time Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">من تاريخ ووقت</label>
                    <Input
                      type="datetime-local"
                      value={deleteDateTimeFrom}
                      onChange={(e) => setDeleteDateTimeFrom(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">إلى تاريخ ووقت</label>
                    <Input
                      type="datetime-local"
                      value={deleteDateTimeTo}
                      onChange={(e) => setDeleteDateTimeTo(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Reset Filter Button */}
                {(deleteStatusFilter !== 'all' || deleteDateTimeFrom || deleteDateTimeTo) && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteStatusFilter('all');
                        setDeleteDateTimeFrom('');
                        setDeleteDateTimeTo('');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-900"
                    >
                      إعادة تعيين فلاتر الحذف
                    </Button>
                  </div>
                )}

                {/* Summary Box */}
                <div className="p-4 rounded-xl border bg-red-50/50 border-red-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">عدد الطلبات المحددة للحذف:</span>
                    <Badge variant={ordersToDelete.length > 0 ? "destructive" : "outline"} className="text-sm px-3 py-1 font-bold">
                      {ordersToDelete.length} طلب
                    </Badge>
                  </div>
                  <p className="text-xs text-red-600 font-medium">
                    ⚠️ تحذير: سيتم حذف جميع الطلبات التي تطابق المعايير المحددة أعلاه نهائياً من قاعدة بيانات Firebase.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-start">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteOrders}
                disabled={isDeleting || ordersToDelete.length === 0}
                className="w-full sm:w-auto font-bold gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جاري الحذف من Firebase...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    تأكيد حذف {ordersToDelete.length === 1 ? 'هذا الطلب' : `${ordersToDelete.length} طلب`} نهائياً
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminOrders;