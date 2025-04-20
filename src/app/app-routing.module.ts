import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './core/auth/login/login.component';
import { FormComponent } from './shared/pages/visiteur/form/form.component';
import { ListComponent } from './shared/pages/visiteur/list/list.component';
import { LivraisonFormComponent } from './shared/pages/livraison/livraison-form/livraison-form.component';
import { LivraisonListComponent } from './shared/pages/livraison/livraison-list/livraison-list.component';
import { DashboardAgentComponent } from './shared/pages/agent/dashboard-agent/dashboard-agent.component';
import { DashboardAdminComponent } from './shared/pages/admin/dashboard-admin/dashboard-admin.component';
import { AjouterUtilisateurComponent } from './shared/pages/admin/ajouter-utilisateur/ajouter-utilisateur.component';
import { ResponsableVisiteurComponent } from './shared/pages/responsable/responsable-visiteur/responsable-visiteur.component';
import { ResponsableLivraisonComponent } from './shared/pages/responsable/responsable-livraison/responsable-livraison.component';

const routes: Routes = [

  {
    path: '' , component: LoginComponent,
  },
  

  //agent - choix sois livraison ou visiteurs
  { path: 'agent/dashboard', component: DashboardAgentComponent },
  
  //agent gerer les visiteurs 
  { path: 'ajouterVisiteur', component: FormComponent },
  { path: 'visiteurs', component: ListComponent },
  
  //agent gerer les livraisons 
  { path: 'ajouterLivraison', component: LivraisonFormComponent },
  { path: 'livraisons', component: LivraisonListComponent },
  
  //admin - dashboard 
  { path: 'admin/dashboard', component: DashboardAdminComponent },
  { path: 'ajouterUtilisateur', component: AjouterUtilisateurComponent },
  
  
  //Responsable - visiteur
  { path: 'responsable/visiteur', component: ResponsableVisiteurComponent },
  
  //Responsable - livraison
  { path: 'responsable/livraison', component: ResponsableLivraisonComponent },

  



  











];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {

  

 }
