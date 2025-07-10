AFRAME.registerComponent('disable-interaction-if-not-presenter', {
    init: function () {
      const allowed = ["presenter-1", "presenter-2", "presenter-3", "presenter-4"];
      const userName = window.APP?.store?.state?.profile?.displayName;
  
      if (!allowed.includes(userName)) {
        console.log(`[Access Control] Disabling interaction for ${userName}`);
  
        const interactiveEntities = document.querySelectorAll('.interactable, [grabbable], [hoverable-visuals], [is-remote-hover-target]');
  
        interactiveEntities.forEach(el => {
          el.removeAttribute('grabbable');
          el.removeAttribute('hoverable-visuals');
        //   el.removeAttribute('is-remote-hover-target');
          el.removeAttribute('tags'); // remove any tag-based interactivity
  
          // Optional: make it non-collidable if needed
          const bodyHelper = el.getAttribute('body-helper');
          if (bodyHelper && bodyHelper.type === 'dynamic') {
            el.setAttribute('body-helper', 'type: static'); // make non-movable
          }
        });
      }
    }
  });
  