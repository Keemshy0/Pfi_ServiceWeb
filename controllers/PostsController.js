import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import AccessControl from '../accessControl.js';
import AccountsController from './AccountsController.js';


export default class PostModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }
    get(id) {
        let accountsController = new AccountsController();
        if (AccessControl.readGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.repository != null) {
                if (id !== '') {
                    let data = this.repository.get(id);
                    if (data != null){
                        let idOwner = data.Owner;
                        let user = accountsController.repository.get(idOwner)
                        if(user != null){
                            data.AvatarOwner = user.Avatar;
                            data.NameOwner = user.Name;
                        }
                        else{
                            data.AvatarOwner = "./no-avatar.png";
                            data.NameOwner = "Inconnue";
                        }
                        this.HttpContext.response.JSON(data);
                    }
                    else
                        this.HttpContext.response.notFound("Ressource not found.");
                } else {
                    let data = this.repository.getAll(this.HttpContext.path.params);
                    if (this.repository.valid()){
                        data.forEach(post => {
                            let idOwner = post.Owner;
                            let user = accountsController.repository.get(idOwner)
                            console.log(user);
                            if(user != null){
                                post.AvatarOwner = user.Avatar;
                                post.NameOwner = user.Name;
                            }
                            else{
                                post.AvatarOwner = "./no-avatar.png";
                                post.NameOwner = "Inconnue";
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