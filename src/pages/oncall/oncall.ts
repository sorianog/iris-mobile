import { Component } from '@angular/core';
import { NavController, NavParams, ActionSheetController, ToastController } from 'ionic-angular';

import { LogoutProvider } from '../../providers/logout/logout';
import { OncallUserPage } from '../oncall-user/oncall-user';
import { OncallTeamPage } from '../oncall-team/oncall-team';
import { IrisProvider, OncallUser, OncallTeam } from '../../providers/iris/iris';
import { IrisInfoProvider } from '../../providers/iris_info/iris_info';


@Component({
  selector: 'page-oncall',
  templateUrl: 'oncall.html',
})
export class OncallPage {
  public searchTerm: string = "";
  public users: any = [];
  public teams: any = [];
  public services: any = [];
  public pinnedTeams: OncallTeam[];

  unfilteredUsers: Array<OncallUser> = [];
  unfilteredTeams: Array<string> = [];
  unfilteredServices: Array<string> = [];

  public usersLoading: boolean = true;
  public teamsLoading: boolean = true;
  public servicesLoading: boolean = true;
  public pinnedTeamsLoading: boolean = true;
  loadingError: boolean = false;


  constructor(private logOut: LogoutProvider, public navCtrl: NavController, public navParams: NavParams, private actionCtrl: ActionSheetController, private iris: IrisProvider, private toastCtrl: ToastController, private irisInfo: IrisInfoProvider) {
  }

  ionViewWillEnter() {
    // pinned teams display on call now data so make sure they are up to date every time
    this.pinnedTeamsLoading = true;
    this.initOncallLists();
    this.initPinnedTems();

  }

  initOncallLists(){
    
    // if users were saved in storage initialize list with that data while we wait from response from server
    if(this.iris.oncallUsersLoaded){
      this.unfilteredUsers = this.iris.oncallUsers;
      this.usersLoading = false;
    }

    // if teams were saved in storage initialize list with that data while we wait from response from server
    if(this.iris.oncallTeamsLoaded){
      this.unfilteredTeams = this.iris.oncallTeams;
      this.teamsLoading = false;
    }

    // if services were saved in storage initialize list with that data while we wait from response from server
    if(this.iris.oncallServicesLoaded){
      this.unfilteredServices = this.iris.oncallServices;
      this.servicesLoading = false;
    }

    this.iris.getOncallUsers().subscribe(
      (users) => {
        this.unfilteredUsers = users.sort((a, b) => {if(b.name > a.name){return -1;}else{return 1;}});
        this.usersLoading = false;
      },
      () => {
        this.createToast('Error: failed to fetch oncall users.');
        this.loadingError = true;
      },

    );

    this.iris.getOncallTeams().subscribe(
      (teams) => {
        this.unfilteredTeams = teams.sort();
        this.teamsLoading = false;
      },
      () => {
        this.createToast('Error: failed to fetch oncall teams.');
        this.loadingError = true;
      }
    );

    this.iris.getOncallServices().subscribe(
      (services) => {
        this.unfilteredServices = services.sort();
        this.servicesLoading = false;
      },
      () => {
        this.createToast('Error: failed to fetch oncall services.');
        this.loadingError = true;
      }
    );

  }

  initPinnedTems(){

    this.iris.getOncallPinnedTeams(this.irisInfo.username).subscribe(
      () => {
        // fire off calls for pinned teams and render them 
        this.pinnedTeams = [];
        for(let pinned_team of this.iris.oncallPinnedTeams){
          let new_team = new OncallTeam;
        
          this.iris.getOncallTeam(pinned_team).subscribe(
            (data) => {
              
              new_team.name = data[0].name;
              new_team.email = data[0].email;
              new_team.slack_channel = data[0].slack_channel;
              new_team.summary = data[1];
              new_team.services = data[0].services;
              new_team.rosters = data[0].rosters;
              this.pinnedTeams.push(new_team);

            },
            () => {
              this.createToast('Error: failed to fetch oncall Team.');
              this.loadingError = true;
            }
          );

          this.pinnedTeamsLoading = false;
        }
      },
      () => {
        this.createToast('Error: failed to fetch oncall pinned teams.');
        this.loadingError = true;
      }
    );

    
  }
  
  refreshPress(){
    this.loadingError = false;
    this.servicesLoading = true;
    this.usersLoading = true;
    this.teamsLoading = true;
    this.pinnedTeamsLoading = true;
    this.initOncallLists();
    this.initPinnedTems();

  }

  setFilteredItems() {
    if(this.searchTerm.length >= 3){
      this.users = this.filterUsers(this.searchTerm);
      this.teams = this.filterTeams(this.searchTerm);
      this.services = this.filterServices(this.searchTerm);
    }
    else{
      this.users = [];
      this.teams = [];
      this.services = [];
    }
  }

  openActionSheet(){
    // Open action bar from the upper right ... button
    let actionSheet = this.actionCtrl.create({
      buttons: [
        {
          text: 'Log out',
          cssClass: 'logout-button',
          handler: () => {
            this.logOut.showLogout();
          },
          icon: 'exit'
        }
      ]
    })
    actionSheet.present()
  }

  userTapped(tapped_user) {
    this.navCtrl.push(OncallUserPage, {
      name: tapped_user
    });
  }
  
  teamTapped(tapped_team) {
    this.navCtrl.push(OncallTeamPage, {
      team_name: tapped_team
    });
  }

  serviceTapped(service) {
    this.iris.getOncallService(service).subscribe(
      team =>{
        this.navCtrl.push(OncallTeamPage, {
          team_name: team[0]
        });
      },
      () => {
      }
    );
  }

  filterUsers(searchTerm) {
    if(this.unfilteredUsers.length < 1){return false;}
    return this.unfilteredUsers.filter(item => {
      if(item.name.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1){return true;}
      if(item.full_name.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1){return true;}
      return false;
    });
  }
  filterTeams(searchTerm) {
    if(this.unfilteredTeams.length < 1){return false;}
    return this.unfilteredTeams.filter(item => {
      return item.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
    });
  }
  filterServices(searchTerm) {
    if(this.unfilteredServices.length < 1){return false;}
    return this.unfilteredServices.filter(item => {
      return item.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
    });
  }


  createToast(message: string) {
    let toast = this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      showCloseButton: true,
      closeButtonText: 'OK'
    });
    toast.present();
  }

}
