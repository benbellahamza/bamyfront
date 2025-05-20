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
import { LivraisonFormComponent } from './shared/pages/livraison/livraison-form/livraison-form.component';
import { AjouterLivraisonComponent } from './shared/pages/livraison/ajouter-livraison/ajouter-livraison.component';
import { LivraisonListComponent } from './shared/pages/livraison/livraison-list/livraison-list.component';

// ⚙️ Admin
import { DashboardAdminComponent } from './shared/pages/admin/dashboard-admin/dashboard-admin.component';
import { AjouterUtilisateurComponent } from './shared/pages/admin/ajouter-utilisateur/ajouter-utilisateur.component';
import { HistoriqueActiviteComponent } from './shared/pages/admin/historique-activite/historique-activite.component'; 

// 📊 Responsable
import { ResponsableVisiteurComponent } from './shared/pages/responsable/responsable-visiteur/responsable-visiteur.component';
import { ResponsableLivraisonComponent } from './shared/pages/responsable/responsable-livraison/responsable-livraison.component';
import { AdminVisiteurComponent } from './shared/pages/admin/admin-visiteur/admin-visiteur.component';
import { DashboardResponsableComponent } from './shared/pages/responsable/dashboard-responsable/dashboard-responsable.component';

const routes: Routes = [

  // Page de connexion
  { path: '', component: LoginComponent },

  // ✅ Dashboard de l'agent
  { path: 'agent/dashboard', component: DashboardAgentComponent },

  // ✅ Page combinée : Formulaire + Liste
  { path: 'ajouterVisiteur', component: AjouterVisiteurPageComponent },

  // ✅ Liste seule des visiteurs (sans formulaire)
  { path: 'visiteurs', component: ListComponent },

  // ✅ Gestion des livraisons pour l'agent
  { path: 'ajouterLivraison', component: AjouterLivraisonComponent },
  { path: 'livraisons', component: LivraisonListComponent },


  // ✅ Gestion des historiques chez l'admin
  { path: 'admin/historique', component: HistoriqueActiviteComponent },

  // ✅ Gestion admin
  { path: 'admin/dashboard', component: DashboardAdminComponent },
  { path: 'ajouterUtilisateur', component: AjouterUtilisateurComponent },
  { path: 'admin/historique', component: HistoriqueActiviteComponent },

  //Le nouveau ajouté
  { path: 'admin/visiteur', component: AdminVisiteurComponent},


  // ✅ Pages responsables
  { path: 'responsable/dashboard', component: DashboardResponsableComponent },
  { path: 'responsable/visiteur', component: ResponsableVisiteurComponent },
  { path: 'responsable/livraison', component: ResponsableLivraisonComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
