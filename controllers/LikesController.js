import LikeModel from '../models/like.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import AccountsController from './AccountsController.js';
import AccessControl from '../accessControl.js';


export default class LikeModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new LikeModel()));
    }
    get(id) {
        let accountsController = new AccountsController();
        if (AccessControl.readGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.repository != null) {
                if (id !== '') {
                    let data = this.repository.get(id);
                    if (data != null){
                        let idUser = data.IdUser;
                        let user = accountsController.repository.get(idUser)
                        if(user != null){
                            data.UserName = user.Name;
                        }
                        else{
                            data.UserName = "Inconnu(e)";
                        }
                        this.HttpContext.response.JSON(data);
                    }
                    else
                        this.HttpContext.response.notFound("Ressource not found.");
                } else {
                    let data = this.repository.getAll(this.HttpContext.path.params);
                    if (this.repository.valid()){
                        data.forEach(like => {
                            let idUser = like.IdUser;
                            let user = accountsController.repository.get(idUser)
                            if(user != null){
                                like.UserName = user.Name;
                            }
                            else{
                                like.UserName = "Inconnu(e)";
                            }
                        });
                        this.HttpContext.response.JSON(data, this.repository.ETag, false, this.requiredAuthorizations);
                    }
                    else
                        this.HttpContext.response.badRequest(this.repository.errorMessages);
                }
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
}