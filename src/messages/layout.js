import { gettext, singleLineString } from 'utils';


export const DUPLICATE_XPI_ENTRY = {
  code: 'DUPLICATE_XPI_ENTRY',
  message: gettext('Package contains duplicate entries'),
  description: gettext(singleLineString`The package contains multiple entries
    with the same name. This practice has been banned. Try unzipping
    and re-zipping your add-on package and try again.`),
};
