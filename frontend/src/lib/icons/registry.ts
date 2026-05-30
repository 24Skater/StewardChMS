import React from 'react'
import type { FC, SVGAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Home, Landmark, Calendar, Music,
  MessageSquare, DollarSign, Handshake, Wallet, TrendingDown,
  FileText, ClipboardList, Building2, ShoppingCart, Package,
  CreditCard, BarChart2, Settings, Plus, Pencil, Trash2, Search,
  Filter, Download, Share2, ArrowDownUp, MoreHorizontal, ExternalLink,
  Check, CheckCircle2, AlertTriangle, XCircle, Info, Mail, Lock,
  User, Phone, MapPin, CalendarDays, X, ChevronLeft, RefreshCw,
  Upload, Copy, Printer, Tag, Star, Bell, LogOut, Eye, EyeOff,
} from 'lucide-react'
import { KidsCheckinIconOutlined, KidsCheckinIconFilled } from './custom/KidsCheckinIcon'
import { MinistryIconOutlined, MinistryIconFilled } from './custom/MinistryIcon'
import { WorshipIconOutlined, WorshipIconFilled } from './custom/WorshipIcon'
import { GivingIconOutlined, GivingIconFilled } from './custom/GivingIcon'

export type IconVariantProps = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export type IconVariant = FC<IconVariantProps>

function lo(L: LucideIcon): IconVariant {
  return ({ size, className, ...aria }) =>
    React.createElement(L, { size, className, ...aria })
}

function lf(L: LucideIcon): IconVariant {
  return ({ size, className, ...aria }) =>
    React.createElement(L, { size, className, fill: 'currentColor', strokeWidth: 0, ...aria })
}

export type IconName =
  | 'dashboard' | 'members' | 'households' | 'groups' | 'events' | 'schedules'
  | 'kids-checkin' | 'songs' | 'messages' | 'giving' | 'pledges'
  | 'funds' | 'expenses' | 'invoices' | 'purchase-orders' | 'vendors'
  | 'products' | 'inventory' | 'sales' | 'reports' | 'settings'
  | 'ministry' | 'worship' | 'giving-hand'
  | 'add' | 'edit' | 'delete' | 'search' | 'filter' | 'download'
  | 'share' | 'sort' | 'more' | 'external-link'
  | 'check' | 'check-circle' | 'alert' | 'error' | 'info'
  | 'mail' | 'lock' | 'user' | 'phone' | 'location' | 'date'
  | 'close' | 'back' | 'refresh' | 'upload' | 'copy' | 'print'
  | 'tag' | 'star' | 'bell' | 'logout' | 'eye' | 'eye-off'

export const registry: Record<IconName, { outlined: IconVariant; filled: IconVariant }> = {
  // Nav
  'dashboard':       { outlined: lo(LayoutDashboard), filled: lf(LayoutDashboard) },
  'members':         { outlined: lo(Users),           filled: lf(Users) },
  'households':      { outlined: lo(Home),            filled: lf(Home) },
  'groups':          { outlined: lo(Landmark),        filled: lf(Landmark) },
  'events':          { outlined: lo(Calendar),        filled: lf(Calendar) },
  'schedules':       { outlined: lo(CalendarDays),    filled: lf(CalendarDays) },
  'kids-checkin':    { outlined: KidsCheckinIconOutlined, filled: KidsCheckinIconFilled },
  'songs':           { outlined: lo(Music),           filled: lf(Music) },
  'messages':        { outlined: lo(MessageSquare),   filled: lf(MessageSquare) },
  'giving':          { outlined: lo(DollarSign),      filled: lf(DollarSign) },
  'pledges':         { outlined: lo(Handshake),       filled: lf(Handshake) },
  'funds':           { outlined: lo(Wallet),          filled: lf(Wallet) },
  'expenses':        { outlined: lo(TrendingDown),    filled: lf(TrendingDown) },
  'invoices':        { outlined: lo(FileText),        filled: lf(FileText) },
  'purchase-orders': { outlined: lo(ClipboardList),   filled: lf(ClipboardList) },
  'vendors':         { outlined: lo(Building2),       filled: lf(Building2) },
  'products':        { outlined: lo(ShoppingCart),    filled: lf(ShoppingCart) },
  'inventory':       { outlined: lo(Package),         filled: lf(Package) },
  'sales':           { outlined: lo(CreditCard),      filled: lf(CreditCard) },
  'reports':         { outlined: lo(BarChart2),       filled: lf(BarChart2) },
  'settings':        { outlined: lo(Settings),        filled: lf(Settings) },
  // Custom church SVGs
  'ministry':        { outlined: MinistryIconOutlined,    filled: MinistryIconFilled },
  'worship':         { outlined: WorshipIconOutlined,     filled: WorshipIconFilled },
  'giving-hand':     { outlined: GivingIconOutlined,      filled: GivingIconFilled },
  // Actions
  'add':             { outlined: lo(Plus),            filled: lf(Plus) },
  'edit':            { outlined: lo(Pencil),          filled: lf(Pencil) },
  'delete':          { outlined: lo(Trash2),          filled: lf(Trash2) },
  'search':          { outlined: lo(Search),          filled: lf(Search) },
  'filter':          { outlined: lo(Filter),          filled: lf(Filter) },
  'download':        { outlined: lo(Download),        filled: lf(Download) },
  'share':           { outlined: lo(Share2),          filled: lf(Share2) },
  'sort':            { outlined: lo(ArrowDownUp),     filled: lf(ArrowDownUp) },
  'more':            { outlined: lo(MoreHorizontal),  filled: lf(MoreHorizontal) },
  'external-link':   { outlined: lo(ExternalLink),    filled: lf(ExternalLink) },
  // Status
  'check':           { outlined: lo(Check),           filled: lf(Check) },
  'check-circle':    { outlined: lo(CheckCircle2),    filled: lf(CheckCircle2) },
  'alert':           { outlined: lo(AlertTriangle),   filled: lf(AlertTriangle) },
  'error':           { outlined: lo(XCircle),         filled: lf(XCircle) },
  'info':            { outlined: lo(Info),            filled: lf(Info) },
  // Form
  'mail':            { outlined: lo(Mail),            filled: lf(Mail) },
  'lock':            { outlined: lo(Lock),            filled: lf(Lock) },
  'user':            { outlined: lo(User),            filled: lf(User) },
  'phone':           { outlined: lo(Phone),           filled: lf(Phone) },
  'location':        { outlined: lo(MapPin),          filled: lf(MapPin) },
  'date':            { outlined: lo(CalendarDays),    filled: lf(CalendarDays) },
  // Misc
  'close':           { outlined: lo(X),               filled: lf(X) },
  'back':            { outlined: lo(ChevronLeft),     filled: lf(ChevronLeft) },
  'refresh':         { outlined: lo(RefreshCw),       filled: lf(RefreshCw) },
  'upload':          { outlined: lo(Upload),          filled: lf(Upload) },
  'copy':            { outlined: lo(Copy),            filled: lf(Copy) },
  'print':           { outlined: lo(Printer),         filled: lf(Printer) },
  'tag':             { outlined: lo(Tag),             filled: lf(Tag) },
  'star':            { outlined: lo(Star),            filled: lf(Star) },
  'bell':            { outlined: lo(Bell),            filled: lf(Bell) },
  'logout':          { outlined: lo(LogOut),          filled: lf(LogOut) },
  'eye':             { outlined: lo(Eye),             filled: lf(Eye) },
  'eye-off':         { outlined: lo(EyeOff),          filled: lf(EyeOff) },
}

export const allIconNames = Object.keys(registry) as IconName[]
