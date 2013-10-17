angular.module('plunker', ['ui.bootstrap']);
function AlertDemoCtrl($scope) {
  $scope.alerts = [];
  var showPrefs = localStorage.getItem('tvShowPrefStore');
  var tempPrefs = showPrefs.split('--');

  for (var i=0; i<tempPrefs.length-1; i++)
  {
    $scope.alerts.push({msg: tempPrefs[i]});
  }

  if (showPrefs == null) {
    showPrefs = "";
  }

  $scope.addAlert = function() {
    var tvShowToAdd = document.getElementById("tvShowList").value;

    if(tempPrefs.indexOf(tvShowToAdd) == -1)
    {
      $scope.alerts.push({msg: tvShowToAdd});

      var stringToStore = tvShowToAdd+'--';

      showPrefs = showPrefs.concat(stringToStore);

      localStorage.setItem('tvShowPrefStore', showPrefs);
    }
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);

    tempPrefs = showPrefs.split('--');
    tempPrefs.splice(index, 1);

    showPrefs = tempPrefs.join('--');

    localStorage.setItem('tvShowPrefStore', showPrefs);
  };

}