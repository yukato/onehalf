'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { CustomerList } from '@/components/masters/CustomerList';
import { CustomerForm } from '@/components/masters/CustomerForm';
import { ProductList } from '@/components/masters/ProductList';
import { ProductForm } from '@/components/masters/ProductForm';
import { CsvImportModal } from '@/components/masters/CsvImportModal';
import type { Customer, Product, ProductCategory } from '@/types';

const PAGE_SIZE = 50;

type TabType = 'customers' | 'products';

export default function AdminMastersPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersOffset, setCustomersOffset] = useState(0);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsOffset, setProductsOffset] = useState(0);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // Modals
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const loadCustomers = useCallback(async (query?: string, newOffset?: number) => {
    try {
      const res = await api.getCompanyCustomers(companySlug, {
        q: query || undefined,
        limit: PAGE_SIZE,
        offset: newOffset ?? customersOffset,
      });
      setCustomers(res.customers);
      setCustomersTotal(res.total);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  }, [companySlug, customersOffset]);

  const loadProducts = useCallback(async (query?: string, newOffset?: number) => {
    try {
      const res = await api.getCompanyProducts(companySlug, {
        q: query || undefined,
        limit: PAGE_SIZE,
        offset: newOffset ?? productsOffset,
      });
      setProducts(res.products);
      setProductsTotal(res.total);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }, [companySlug, productsOffset]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.getCompanyProductCategories(companySlug);
      setCategories(res.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [companySlug]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadCustomers('', 0), loadProducts('', 0), loadCategories()]);
      setIsLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    if (activeTab === 'customers') {
      setCustomersOffset(0);
      loadCustomers(searchQuery, 0);
    } else {
      setProductsOffset(0);
      loadProducts(searchQuery, 0);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Customer handlers
  const handleCustomerPageChange = (newOffset: number) => {
    setCustomersOffset(newOffset);
    loadCustomers(searchQuery, newOffset);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('この取引先を削除しますか？')) return;
    try {
      await api.deleteCompanyCustomer(companySlug, id);
      await loadCustomers(searchQuery, customersOffset);
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  const handleCustomerSaved = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
    loadCustomers(searchQuery, customersOffset);
  };

  // Product handlers
  const handleProductPageChange = (newOffset: number) => {
    setProductsOffset(newOffset);
    loadProducts(searchQuery, newOffset);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('この商品を削除しますか？')) return;
    try {
      await api.deleteCompanyProduct(companySlug, id);
      await loadProducts(searchQuery, productsOffset);
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  const handleProductSaved = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    loadProducts(searchQuery, productsOffset);
  };

  const handleCsvImportComplete = () => {
    setShowCsvImport(false);
    if (activeTab === 'customers') {
      loadCustomers(searchQuery, 0);
      setCustomersOffset(0);
    } else {
      loadProducts(searchQuery, 0);
      setProductsOffset(0);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ModuleHeader
        moduleName="マスタ管理"
        icon="database"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCsvImport(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              CSVインポート
            </button>
            <button
              onClick={() => {
                if (activeTab === 'customers') {
                  setEditingCustomer(null);
                  setShowCustomerForm(true);
                } else {
                  setEditingProduct(null);
                  setShowProductForm(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規登録
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-4">
        <button
          onClick={() => handleTabChange('customers')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'customers'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          取引先
        </button>
        <button
          onClick={() => handleTabChange('products')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          商品
        </button>
      </div>

      {/* Search */}
      <SearchBox
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={handleSearch}
        placeholder={activeTab === 'customers' ? 'コード・名前・担当者で検索...' : 'コード・商品名で検索...'}
        submitLabel="検索"
        className="mb-4"
      />

      {/* Content */}
      {activeTab === 'customers' ? (
        <CustomerList
          customers={customers}
          total={customersTotal}
          offset={customersOffset}
          limit={PAGE_SIZE}
          onPageChange={handleCustomerPageChange}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
        />
      ) : (
        <ProductList
          products={products}
          total={productsTotal}
          offset={productsOffset}
          limit={PAGE_SIZE}
          onPageChange={handleProductPageChange}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />
      )}

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CustomerForm
          customer={editingCustomer}
          onSave={handleCustomerSaved}
          onClose={() => { setShowCustomerForm(false); setEditingCustomer(null); }}
        />
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onSave={handleProductSaved}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
        />
      )}

      {/* CSV Import Modal */}
      {showCsvImport && (
        <CsvImportModal
          type={activeTab}
          onComplete={handleCsvImportComplete}
          onClose={() => setShowCsvImport(false)}
        />
      )}
    </div>
  );
}
