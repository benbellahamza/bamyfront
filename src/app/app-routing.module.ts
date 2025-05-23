import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// 🔐 Auth
import { LoginComponent } from './core/auth/login/login.component';

// 👨‍💼 Agent
import { DashboardAgentComponent } from './shared/pages/agent/dashboard-agent/dashboard-agent.component';

// 🧾 Visiteur (Formulaire + Liste)
import { AjouterVisiteurPageComponent } from './shared/pages/visiteur/ajouter-visiteur-page/ajouter-visiteur-page.component';
import { ListComponent } from './shared/pages/visiteur/list/list.component';

// 🚚 Livraison
import { AjouterLivraisonComponent } from './shared/pages/livraison/ajouter-livraison/ajouter-livraison.component';
import { LivraisonFormComponent } from './shared/pages/livraison/livraison-form/livraison-form.component';
import { LivraisonListComponent } from './shared/pages/livraison/livraison-list/livraison-list.component';

// ⚙️ Admin
import { DashboardAdminComponent } from './shared/pages/admin/dashboard-admin/dashboard-admin.component';
import { AjouterUtilisateurComponent } from './shared/pages/admin/ajouter-utilisateur/ajouter-utilisateur.component';
import { HistoriqueActiviteComponent } from './shared/pages/admin/historique-activite/historique-activite.component'; 
import { AdminVisiteurComponent } from './shared/pages/admin/admin-visiteur/admin-visiteur.component';
import { AdminLivraisonComponent } from './shared/pages/admin/admin-livraison/admin-livraison.component';

// 📊 Responsable
import { ResponsableVisiteurComponent } from './shared/pages/responsable/responsable-visiteur/responsable-visiteur.component';
import { ResponsableLivraisonComponent } from './shared/pages/responsable/responsable-livraison/responsable-livraison.component';
import { DashboardResponsableComponent } from './shared/pages/responsable/dashboard-responsable/dashboard-responsable.component';

// 🛡️ Guards
import { RoleGuard } from './core/guards/role.guard';

const routes: Routes = [
  { path: '', component: LoginComponent },

  // Agent
  { path: 'agent/dashboard', component: DashboardAgentComponent, canActivate: [RoleGuard], data: { roles: ['AGENT'] } },
  { path: 'ajouterVisiteur', component: AjouterVisiteurPageComponent, canActivate: [RoleGuard], data: { roles: ['AGENT'] } },
  { path: 'visiteurs', component: ListComponent, canActivate: [RoleGuard], data: { roles: ['AGENT'] } },
  { path: 'ajouterLivraison', component: AjouterLivraisonComponent, canActivate: [RoleGuard], data: { roles: ['AGENT'] } },
  { path: 'livraison/entree', component: LivraisonFormComponent, canActivate: [RoleGuard], data: { roles: ['AGENT'] } },
  { path: 'livraison/sortie', component: LivraisonListComponent, canActivate: [RoleGuard], data: { roles: ['AGENT'] } },
  { path: 'livraisons', component: LivraisonListComponent, canActivate: [RoleGuard], data: { roles: ['AGENT'] } },

  // Admin
  { path: 'admin/dashboard', component: DashboardAdminComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'ajouterUtilisateur', component: AjouterUtilisateurComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin/historique', component: HistoriqueActiviteComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin/visiteur', component: AdminVisiteurComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin/livraison', component: AdminLivraisonComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },

  // Responsable
  { path: 'responsable/dashboard', component: DashboardResponsableComponent, canActivate: [RoleGuard], data: { roles: ['RESPONSABLE'] } },
  { path: 'responsable/visiteur', component: ResponsableVisiteurComponent, canActivate: [RoleGuard], data: { roles: ['RESPONSABLE'] } },
  { path: 'responsable/livraison', component: ResponsableLivraisonComponent, canActivate: [RoleGuard], data: { roles: ['RESPONSABLE'] } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
