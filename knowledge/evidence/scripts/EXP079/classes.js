'use strict';
const {READ,feature}=require('./archive');
// folders: the feature base, then a class-specific tail (to be split as more instances are seen)
for(const c of ['moCommentsFolder_c','moFavoriteFolder_c'])READ[c]=(r,o)=>{feature(r,o);};
