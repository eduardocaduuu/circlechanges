import { useStore } from '@/lib/store';
import { LayoutDashboard, Users, Package, ShoppingCart, TrendingUp, Database } from 'lucide-react';

const tabs = [
  { id: 'overview' as const, label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'clients' as const, label: 'Clientes', icon: Users },
  { id: 'products' as const, label: 'Produtos', icon: Package },
  { id: 'basket' as const, label: 'Comprados Juntos', icon: ShoppingCart },
  { id: 'predictions' as const, label: 'Previsões', icon: TrendingUp },
  { id: 'data' as const, label: 'Dados', icon: Database },
];

export default function TabNavigation() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <div className="glass rounded-xl p-2 flex gap-2 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap
              ${
                isActive
                  ? 'bg-gradient-green text-white glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
