## Corona Dashboard Icons

This package contains all of the icons used in the Corona Dashboard.

We forked [react-feather](https://github.com/feathericons/react-feather) and adapted it to our needs. Carmelo Pullara and other contributors, thanks for the inspiration and open-sourcing your codebase!

### Usage

```javascript
import React from 'react';
import { Bibliotheken } from '@corona-dashboard/icons';

const App = () => {
  return <Bibliotheken />;
};

export default App;
```

Icons can be configured with inline props:

```javascript
<Bibliotheken color="red" size={48} />
```

If you can't use ES6 imports, it's possible to include icons from the compiled folder ./dist.

```javascript
var Bibliotheken =
  require('@corona-dashboard/icons/dist/icons/Bibliotheken').default;

var MyComponent = React.createClass({
  render: function () {
    return <Bibliotheken />;
  },
});
```

You can also include the whole icon pack:

```javascript
import React from 'react';
import * as Icon from '@corona-dashboard/icons';

const App = () => {
  return <Icon.Bibliotheken />;
};

export default App;
```
